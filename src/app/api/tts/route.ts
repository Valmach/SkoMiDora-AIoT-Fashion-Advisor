import { NextResponse } from 'next/server';
import textToSpeech from '@google-cloud/text-to-speech';

const client = new textToSpeech.TextToSpeechClient();

// A dictionary mapping base languages to Google's premium voice models
const voiceMap: Record<string, { languageCode: string, name: string }> = {
  'en': { languageCode: 'en-GB', name: 'en-GB-Journey-F' }, // British English (Journey)
  'fr': { languageCode: 'fr-FR', name: 'fr-FR-Journey-F' }, // French (Journey)
  'es': { languageCode: 'es-ES', name: 'es-ES-Journey-F' }, // Spanish (Journey)
  'it': { languageCode: 'it-IT', name: 'it-IT-Wavenet-A' }, // Italian (Wavenet)
  'no': { languageCode: 'nb-NO', name: 'nb-NO-Wavenet-E' }, // Norwegian (Wavenet)
  'de': { languageCode: 'de-DE', name: 'de-DE-Journey-F' }, // German (Journey)
};

export async function POST(request: Request) {
  try {
    const { text, locale = 'en' } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Extract the base language (e.g., 'fr' from 'fr-FR' or 'fr-CA')
    const baseLang = locale.split('-')[0];
    
    // Select the premium voice for their language, or fall back to English
    const selectedVoice = voiceMap[baseLang] || voiceMap['en'];

    const requestPayload = {
      input: { text: text },
      voice: selectedVoice, 
      audioConfig: { audioEncoding: 'MP3' as const },
    };

    const [response] = await client.synthesizeSpeech(requestPayload);
    
    if (!response.audioContent) {
      throw new Error("No audio content returned from GCP");
    }

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