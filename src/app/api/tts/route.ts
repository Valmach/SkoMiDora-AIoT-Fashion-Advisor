import { NextResponse } from 'next/server';

const voiceMap: Record<string, Array<{ languageCode: string; name?: string; ssmlGender?: string }>> = {
  en: [
    { languageCode: 'en-GB', name: 'en-GB-Neural2-F' },
    { languageCode: 'en-GB', name: 'en-GB-Wavenet-F' },
    { languageCode: 'en-GB', ssmlGender: 'FEMALE' },
  ],
  fr: [{ languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' }],
  es: [{ languageCode: 'es-ES', name: 'es-ES-Neural2-A' }],
  it: [{ languageCode: 'it-IT', name: 'it-IT-Neural2-A' }],
  no: [{ languageCode: 'nb-NO', name: 'nb-NO-Wavenet-E' }],
  de: [{ languageCode: 'de-DE', name: 'de-DE-Neural2-A' }],
};

export async function POST(request: Request) {
  try {
    const { text, locale = 'en' } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY;

    if (!apiKey) {
      throw new Error('Missing GOOGLE_TTS_API_KEY in environment variables');
    }

    const baseLang = String(locale).split('-')[0].toLowerCase();
    const selectedVoices = voiceMap[baseLang] || voiceMap.en;

    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    let data: any = null;
    let lastError = '';

    for (const selectedVoice of selectedVoices) {
      const payload = {
        input: { text },
        voice: selectedVoice,
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.1,
          pitch: 0,
        },
      };

      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        data = await response.json();
        break;
      }

      lastError = await response.text();
      console.error('GCP TTS voice failed:', selectedVoice, lastError);
    }

    if (!data?.audioContent) {
      throw new Error(`Google TTS failed for all candidate voices: ${lastError}`);
    }

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
