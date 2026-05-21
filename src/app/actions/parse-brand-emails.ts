'use server';

import { google } from 'googleapis';
import { db as adminDb } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FashionItemSchema = z.object({
  itemName: z.string().describe("The specific name of the item purchased. If absolutely none found, return 'FAILED_TO_FIND_ITEM'"),
  brand: z.string().describe("The designer, brand name, or manufacturer. Default to 'Unknown' if not found."),
  clothingType: z.string().describe("Categorize the item (e.g., Electronics, Home, Shoes, Accessory)."),
  color: z.string().describe("The primary color of the item, or 'N/A'"),
  imageUrl: z.string().optional().describe("A URL pointing to the product image, if found in the email HTML"),
});

// Helper function to dig through nested email MIME types
function extractEmailBody(payload: any): string {
  let body = '';
  if (!payload) return body;

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
        if (part.body?.data) {
          body += Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8') + '\n';
        }
      } else if (part.parts) {
        body += extractEmailBody(part); 
      }
    }
  } else if (payload.body?.data) {
    body = Buffer.from(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  }
  return body;
}

export async function parseBrandEmails() {
  if (!adminDb) {
    throw new Error("Firebase Admin DB is not initialized.");
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'Amazon', 
      maxResults: 5, 
    });

    const messages = response.data.messages;
    if (!messages || messages.length === 0) {
      return { success: true, count: 0, message: "No order emails found." };
    }

    let ingestedCount = 0;
    let lastParsedItem = null;

    for (const message of messages) {
      if (!message.id) continue;

      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full', 
      });

      const emailBody = extractEmailBody(msgData.data.payload);
      const emailSnippet = msgData.data.snippet || "";
      
      // We pass BOTH the clean snippet and the HTML body (truncated to save AI tokens)
      const textToParse = `
        INBOX PREVIEW SNIPPET (Highly Reliable Text): 
        ${emailSnippet}
        
        RAW EMAIL BODY (May contain messy HTML): 
        ${emailBody.substring(0, 8000)}
      `;

      const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: `You are an expert data extraction bot. Your job is to find the purchased product inside this messy, forwarded Amazon receipt email. 
        
        CRITICAL INSTRUCTIONS:
        1. Ignore all HTML tags, layout code, and forwarding headers.
        2. Look heavily at the "INBOX PREVIEW SNIPPET" as it often contains the plain text of the item name.
        3. Extract the primary item purchased. Even if it is a book, a cable, or a household good, extract it.
        
        Email Content:\n${textToParse}`,
        output: { schema: FashionItemSchema }
      });

      // Only save to DB if it actually found an item and didn't trigger our failure string
      if (output && output.itemName && output.itemName !== "FAILED_TO_FIND_ITEM" && output.itemName !== "N/A") {
        const docRef = await adminDb.collection('wardrobeItems').add({
          ...output,
          ingestedAt: new Date().toISOString(),
          source: 'gmail_pipeline_amazon_test'
        });

        ingestedCount++;
        lastParsedItem = output;
      } else {
        // Capture the failure so we can see it in the UI output
        lastParsedItem = output; 
      }
    }

    return { success: true, count: messages.length, ingested: ingestedCount, lastItem: lastParsedItem };

  } catch (error: any) {
    console.error("❌ Pipeline Error:", error);
    return { success: false, error: error.message || "Failed to process emails." };
  }
}