import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

export const ai = genkit({
  plugins: [googleAI()],
  model: {
    default: "googleai/gemini-1.5-flash-latest",
  },
});

export default ai;
