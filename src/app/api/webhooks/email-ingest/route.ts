import { NextResponse } from 'next/server';
import { collection, addDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase'; // Ensure this points to your initialized Firebase app

// Force Next.js to treat this as a live, listening API route instead of freezing it into a 404 static file
export const dynamic = 'force-dynamic';

// 1. NEW: Added a GET handler so you can verify the URL is live in your browser!
export async function GET() {
  return NextResponse.json({ 
    status: "success", 
    message: "SkoMiDora Webhook is online and ready to receive SendGrid emails!" 
  }, { status: 200 });
}

// 2. The POST handler (For SendGrid's invisible data drops)
export async function POST(req: Request) {
  try {
    // Verify Webhook Secret (Prevent unauthorized posts)
    // NOTE: Temporarily bypassed the secret requirement for initial testing. 
    // You can uncomment these lines once everything is working smoothly.
    /*
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.SKOMIDORA_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    */

    // Parse the incoming email payload (SendGrid sends multipart/form-data)
    const formData = await req.formData();
    const emailSubject = formData.get('subject') as string || "";
    const emailText = formData.get('text') as string || "";
    const sender = formData.get('from') as string || "";

    if (!emailText) {
      return NextResponse.json({ error: 'No email body found' }, { status: 400 });
    }

    // Send to Gemini 2.5 Flash for Data Extraction
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const promptText = `
      You are the AI Concierge for SkoMiDora, a luxury fashion app.
      Analyze this forwarded email. Determine if it is a retail purchase receipt (like Amazon/Designer) OR an event invitation/confirmation.
      
      Email Subject: ${emailSubject}
      Email Body: ${emailText}

      Extract the data into this EXACT JSON structure. If it's a receipt, fill the 'closetItems' array. If it's an event, fill the 'eventDetails' object.
      {
        "type": "receipt" | "event" | "unknown",
        "closetItems": [
          { "name": "string", "brand": "string", "color": "string", "category": "shoes | tops | bottoms | accessories", "purchaseDate": "ISO string" }
        ],
        "eventDetails": {
          "eventName": "string",
          "date": "ISO string",
          "location": "string",
          "description": "string"
        }
      }
    `;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: "Return strictly JSON." }] },
      generationConfig: { responseMimeType: "application/json" }
    };

    const aiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const aiData = await aiResponse.json();
    const extractedData = JSON.parse(aiData.candidates[0].content.parts[0].text);

    // Route the extracted data to the correct Firestore collection
    if (!firestore) throw new Error("Firestore not initialized");

    if (extractedData.type === 'receipt' && extractedData.closetItems.length > 0) {
      // Save items to the Wardrobe
      for (const item of extractedData.closetItems) {
        await addDoc(collection(firestore, 'publicWardrobeItems'), {
          ...item,
          source: 'email_ingestion',
          createdAt: new Date()
        });
      }
      console.log(`Successfully ingested ${extractedData.closetItems.length} items from receipt.`);
    } 
    else if (extractedData.type === 'event' && extractedData.eventDetails) {
      // Save event to the synced events/agenda
      await addDoc(collection(firestore, 'syncedEvents'), {
        ...extractedData.eventDetails,
        source: 'email_ingestion',
        createdAt: new Date()
      });
      console.log(`Successfully ingested event: ${extractedData.eventDetails.eventName}`);
    }

    return NextResponse.json({ success: true, processedType: extractedData.type });

  } catch (error) {
    console.error("Webhook Processing Error:", error);
    return NextResponse.json({ error: 'Failed to process email payload' }, { status: 500 });
  }
}