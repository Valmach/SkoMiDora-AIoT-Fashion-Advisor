import { NextResponse } from 'next/server';
import textToSpeech from '@google-cloud/text-to-speech';

// Initialize the GCP client
const client = new textToSpeech.TextToSpeechClient();

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const requestPayload = {
      input: { text: text },
      // 'Journey' voices are Google's newest, hyper-realistic premium tier
      voice: { languageCode: 'en-GB', ssmlGender: 'FEMALE' }, 
      audioConfig: { audioEncoding: 'MP3' as const },
    };

    const [response] = await client.synthesizeSpeech(requestPayload);
    
    if (!response.audioContent) {
      throw new Error("No audio content returned from GCP");
    }

    // Return the MP3 file directly to the frontend
    return new NextResponse(response.audioContent, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Google TTS Error:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}