'use server';

import { google } from 'googleapis';
import { adminDb } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// 1. UNIVERSAL FASHION SCHEMA (Matches your Firebase Database exactly)
const FashionItemSchema = z.object({
  itemName: z.string().describe("Clean, elegant name for the item (e.g., 'Satin Bow Pump'). If the receipt is NOT for clothing, shoes, or accessories, return 'FAILED_TO_FIND_ITEM'"),
  itemType: z.string().describe("Category (e.g., Shoes, Dress, Top, Bag, Outerwear). Default to 'Uncategorized' if unknown."),
  designer: z.string().describe("The designer, brand name, or retailer (e.g., 'Chanel', 'Zara', 'Shopify Store'). Default to 'Unknown'."),
  color: z.string().describe("The primary color of the item, or 'N/A'"),
  generalMaterial: z.string().describe("Material if mentioned (e.g., 'Leather', 'Silk'), or 'N/A'"),
  price: z.string().describe("Price as a string (e.g., '$120.00'), or 'N/A'"),
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

    // 2. UNIVERSAL GMAIL QUERY
    // Look for receipts and orders, ignoring Amazon-specific locks
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:(receipt OR order OR confirmation) -label:promotions', 
      maxResults: 5, 
    });

    const messages = response.data.messages;
    if (!messages || messages.length === 0) {
      return { success: true, count: 0, message: "No recent order emails found." };
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
      
      const textToParse = `
        INBOX PREVIEW SNIPPET: 
        ${emailSnippet}
        
        RAW EMAIL BODY: 
        ${emailBody.substring(0, 8000)}
      `;

      // 3. THE LUXURY FASHION AI PROMPT
      const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: `You are an expert data extraction bot for a luxury digital closet application. Your job is to find FASHION items inside this messy email receipt.
        
        CRITICAL INSTRUCTIONS:
        1. Ignore all HTML tags, layout code, and forwarding headers.
        2. Extract ONLY clothing, footwear, accessories, or jewelry. 
        3. If this receipt is for electronics, books, groceries, Uber rides, software, or non-fashion items, you MUST set itemName to 'FAILED_TO_FIND_ITEM'.
        
        Email Content:\n${textToParse}`,
        output: { schema: FashionItemSchema }
      });

      // 4. SAVE DIRECTLY TO DIGITAL CLOSET
      if (output && output.itemName && output.itemName !== "FAILED_TO_FIND_ITEM" && output.itemName !== "N/A") {
        
        // Pushing to publicWardrobeItems so it shows up in your main closet
        const docRef = await adminDb.collection('publicWardrobeItems').add({
          ...output,
          createdAt: new Date().toISOString(), 
          source: 'universal_email_ingestion'
        });

        ingestedCount++;
        lastParsedItem = output;
      } else {
        lastParsedItem = output; 
      }
    }

    return { success: true, count: messages.length, ingested: ingestedCount, lastItem: lastParsedItem };

  } catch (error: any) {
    console.error("❌ Pipeline Error:", error);
    return { success: false, error: error.message || "Failed to process emails." };
  }
}