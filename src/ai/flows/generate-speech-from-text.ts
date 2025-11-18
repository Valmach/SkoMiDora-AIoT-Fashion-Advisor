"use server";
/**
 * @fileOverview A flow that converts text to speech using Google's TTS model.
 *
 * - generateSpeechFromText - A function that takes text and returns an audio data URI.
 */

import { ai } from "@/ai/genkit";
import { z } from "zod";
import wav from "wav";

const SpeechInputSchema = z.string();

const SpeechOutputSchema = z.object({
  media: z
    .string()
    .describe("The generated audio as a data URI in WAV format."),
});

export async function generateSpeechFromText(
  text: string,
): Promise<z.infer<typeof SpeechOutputSchema>> {
  return generateSpeechFromTextFlow(text);
}

const generateSpeechFromTextFlow = ai.defineFlow(
  {
    name: "generateSpeechFromTextFlow",
    inputSchema: SpeechInputSchema,
    outputSchema: SpeechOutputSchema,
  },
  async (text) => {
    const { media } = await ai.generate({
      model: "googleai/gemini-2.5-flash-preview-tts",
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Algenib" }, // A standard, clear voice
          },
        },
      },
      prompt: text,
    });

    if (!media || !media.url) {
      throw new Error("No audio media was returned from the TTS model.");
    }

    // The model returns raw PCM data, which needs a WAV header to be playable in browsers.
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(",") + 1),
      "base64",
    );

    const wavData = await toWav(audioBuffer);

    return {
      media: "data:audio/wav;base64," + wavData,
    };
  },
);

/**
 * Converts raw PCM audio data to a Base64-encoded WAV format string.
 */
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
    writer.on("error", reject);
    writer.on("data", (d) => bufs.push(d));
    writer.on("end", () => resolve(Buffer.concat(bufs).toString("base64")));

    writer.write(pcmData);
    writer.end();
  });
}
