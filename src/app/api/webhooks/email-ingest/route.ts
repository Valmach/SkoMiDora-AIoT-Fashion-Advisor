import { NextResponse } from 'next/server';
import { collection, addDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase'; // Ensure this points to your initialized Firebase app

// Force Next.js to treat this as a live, listening API route instead of freezing it into a 404 static file
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ 
    status: "success", 
    message: "SkoMiDora Webhook is online and ready to receive SendGrid emails!" 
  }, { status: 200 });
}

export async function POST(req: Request) {
  try {
    // Parse the incoming email payload (SendGrid sends multipart/form-data)
    const formData = await req.formData();
    const emailSubject = formData.get('subject') as string || "";
    
    // Fallback to HTML if plain text is missing in the email payload
    const emailText = (formData.get('text') as string) || (formData.get('html') as string) || "";
    
    if (!emailText) {
      return NextResponse.json({ error: 'No email body found in text or html fields' }, { status: 400 });
    }

    // FIX: Look specifically for the secure server-side keys from your .env file
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
    
    if (!apiKey) {
      console.error("🚨 CRITICAL ERROR: Gemini API key is missing in the live Firebase environment!");
      return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const promptText = `
      You are the AI Concierge for SkoMiDora, a luxury fashion app.
      Analyze this forwarded email. Determine if it is a retail purchase receipt OR an event invitation.
      
      CRITICAL RULE FOR RECEIPTS: ONLY extract FASHION, CLOTHING, FOOTWEAR, and ACCESSORY items. 
      You MUST completely ignore household items, groceries, cleaning supplies, tools, electronics, or food.
      If the receipt contains ONLY non-fashion items (e.g., butter, oil, glass cleaner), classify the type as "ignored" and leave closetItems empty.

      Email Subject: ${emailSubject}
      Email Body: ${emailText}

      Extract the data into this EXACT JSON structure to match the frontend database schema. For imageUrl, look for any valid image links in the email, otherwise leave empty.
      {
        "type": "receipt" | "event" | "ignored" | "unknown",
        "closetItems": [
          { "itemName": "string", "brand": "string", "color": "string", "itemType": "shoes | tops | bottoms | accessories", "imageUrl": "string", "purchaseDate": "ISO string" }
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

    // Safely intercept Gemini errors
    if (!aiData.candidates || aiData.candidates.length === 0) {
      console.error("GEMINI API ERROR. Full payload from Google:", JSON.stringify(aiData, null, 2));
      return NextResponse.json({ error: 'Gemini API failed or rejected the prompt', details: aiData }, { status: 500 });
    }

    const rawText = aiData.candidates[0].content?.parts?.[0]?.text;
    
    if (!rawText) {
      console.error("GEMINI RETURNED EMPTY TEXT");
      return NextResponse.json({ error: 'Empty response from Gemini' }, { status: 500 });
    }

    // Clean the JSON output
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```/g, '').trim();
    }

    const extractedData = JSON.parse(cleanJson);

    // Route the extracted data to the correct Firestore collection
    if (!firestore) throw new Error("Firestore not initialized");

    if (extractedData.type === 'receipt' && extractedData.closetItems.length > 0) {
      for (const item of extractedData.closetItems) {
        await addDoc(collection(firestore, 'publicWardrobeItems'), {
          ...item,
          source: 'email_ingestion',
          createdAt: new Date()
        });
      }
      console.log(`Successfully ingested ${extractedData.closetItems.length} items from receipt.`);
    } 
    else if (extractedData.type === 'ignored') {
       console.log(`Ignored non-fashion receipt.`);
    }
    else if (extractedData.type === 'event' && extractedData.eventDetails) {
      await addDoc(collection(firestore, 'syncedEvents'), {
        ...extractedData.eventDetails,
        source: 'email_ingestion',
        createdAt: new Date()
      });
      console.log(`Successfully ingested event: ${extractedData.eventDetails.eventName}`);
    }

    return NextResponse.json({ success: true, processedType: extractedData.type });

  } catch (error: any) {
    console.error("Webhook Processing Error:", error);
    return NextResponse.json({ error: 'Failed to process email payload', details: error?.message || String(error) }, { status: 500 });
  }
}