
"use server";
/**
 * @fileOverview A flow that gets weather for a city and provides style advice.
 *
 * - getWeatherAndAdvice - A function that returns weather and style advice.
 * - GetWeatherAndAdviceInput - The Zod schema for the input.
 * - GetWeatherAndAdviceOutput - The Zod schema for the output.
 */

import { ai } from "@/ai/genkit";
import { z } from "zod";

const GetWeatherAndAdviceInputSchema = z.string();

const GetWeatherAndAdviceOutputSchema = z.object({
  advice: z
    .string()
    .describe("Style advice based on the weather. Use British English."),
  temp: z.number().describe("The temperature in Celsius."),
  condition: z.string().describe("The weather condition."),
});

export type GetWeatherAndAdviceOutput = z.infer<
  typeof GetWeatherAndAdviceOutputSchema
>;

// This is the tool that the AI can use to get weather data.
const getWeatherTool = ai.defineTool(
  {
    name: "getWeather",
    description: "Get the current weather for a given city.",
    inputSchema: z.object({ city: z.string() }),
    outputSchema: z.object({
      temperature: z.number(),
      condition: z.string(),
    }),
  },
  async ({ city }) => {
    // This is a mock implementation.
    // In a real app, you would use the AccuWeather API key from environment variables.
    // For this example, we'll simulate the API call and response.
    console.log(`TOOL CALLED: getWeather for city: ${city}`);

    // Simple mock logic based on city name for demonstration
    let temp = 20;
    let condition = "Partly Cloudy";
    if (city.toLowerCase().includes("london")) {
      temp = 15;
      condition = "Cloudy with a chance of rain";
    } else if (city.toLowerCase().includes("dubai")) {
      temp = 35;
      condition = "Sunny and hot";
    } else if (city.toLowerCase().includes("reykjavik")) {
      temp = 5;
      condition = "Cold and windy";
    }

    return {
      temperature: temp,
      condition: condition,
    };
  },
);

// This is the main prompt that uses the tool.
const advicePrompt = ai.definePrompt({
  name: "weatherAdvicePrompt",
  input: { schema: GetWeatherAndAdviceInputSchema },
  output: { schema: GetWeatherAndAdviceOutputSchema },
  tools: [getWeatherTool],
  prompt: `Based on the weather for {{input}}, provide a short (1-2 sentence) style advice using British English.
  Then, provide the temperature in Celsius and a brief weather condition description.
  `,
});

// This is the exported flow that orchestrates the call.
export const getWeatherAndAdvice = ai.defineFlow(
  {
    name: "getWeatherAndAdviceFlow",
    inputSchema: GetWeatherAndAdviceInputSchema,
    outputSchema: GetWeatherAndAdviceOutputSchema,
  },
  async (city) => {
    try {
      const { output } = await advicePrompt(city);
      if (!output) {
        throw new Error(
          "Failed to get weather advice from AI. The model returned a null output.",
        );
      }
      return output;
    } catch (e: any) {
      console.error(
        "Error in getWeatherAndAdviceFlow, returning fallback advice.",
        e.message,
      );
      // Provide a structured fallback that matches the schema
      return {
        advice:
          "When the weather is unpredictable, layering is key. A stylish trench coat or a light cashmere jumper can be both practical and chic. Opt for waterproof footwear if rain is a possibility.",
        temp: 18,
        condition: "Service Unavailable",
      };
    }
  },
);
