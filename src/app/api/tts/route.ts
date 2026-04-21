import { NextResponse } from 'next/server';

// Dictionary mapping base languages to Google's premium voice models
const voiceMap: Record<string, { languageCode: string, name: string }> = {
  'en': { languageCode: 'en-GB', name: 'en-GB-Journey-F' }, 
  'fr': { languageCode: 'fr-FR', name: 'fr-FR-Journey-F' }, 
  'es': { languageCode: 'es-ES', name: 'es-ES-Journey-F' }, 
  'it': { languageCode: 'it-IT', name: 'it-IT-Wavenet-A' }, 
  'no': { languageCode: 'nb-NO', name: 'nb-NO-Wavenet-E' }, 
  'de': { languageCode: 'de-DE', name: 'de-DE-Journey-F' }, 
};

export async function POST(request: Request) {
  try {
    const { text, locale = 'en' } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GOOGLE_TTS_API_KEY in environment variables");
    }

    // Extract the base language (e.g., 'fr' from 'fr-FR')
    const baseLang = locale.split('-')[0];
    const selectedVoice = voiceMap[baseLang] || voiceMap['en'];

    // Call the direct Google Cloud REST API
    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    const payload = {
      input: { text: text },
      voice: selectedVoice,
      audioConfig: { audioEncoding: 'MP3' }
    };

    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("GCP TTS API Error:", errorData);
      throw new Error(`Google API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      throw new Error("No audio content returned from GCP");
    }

    // The REST API returns a base64 string. We must decode it into a Buffer for the audio player.
    const audioBuffer = Buffer.from(data.audioContent, 'base64');

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('TTS Route Error:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}