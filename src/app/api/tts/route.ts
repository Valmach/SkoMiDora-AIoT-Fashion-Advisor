import { NextResponse } from 'next/server';

// FIXED: Mapped to verified, ultra-premium Google Cloud TTS models
const voiceMap: Record<string, { languageCode: string, name?: string, ssmlGender?: string }> = {
  'en': { languageCode: 'en-GB', ssmlGender: 'FEMALE' },   // British English female voice
  'fr': { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' },   // Premium French Female
  'es': { languageCode: 'es-ES', name: 'es-ES-Neural2-A' },   // Premium Spanish Female
  'it': { languageCode: 'it-IT', name: 'it-IT-Neural2-A' },   // Premium Italian Female
  'no': { languageCode: 'nb-NO', name: 'nb-NO-Wavenet-E' },   // Premium Norwegian Female
  'de': { languageCode: 'de-DE', name: 'de-DE-Neural2-A' },   // Premium German Female
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

    // Extract the base language and match it against our verified dictionary
    const baseLang = locale.split('-')[0].toLowerCase();
    const selectedVoice = voiceMap[baseLang] || voiceMap['en'];

    // Call the direct Google Cloud REST API (bypassing the protobufjs webpack crash)
    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    const payload = {
      input: { text: text },
      voice: selectedVoice,
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate: 1.0, // Ensures a natural, luxurious pacing
        pitch: 0 
      }
    };

    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("GCP TTS API Error:", JSON.stringify(errorData, null, 2));
      throw new Error(`Google API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      throw new Error("No audio content returned from GCP");
    }

    // Decode the base64 string into a Buffer for the browser audio player
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