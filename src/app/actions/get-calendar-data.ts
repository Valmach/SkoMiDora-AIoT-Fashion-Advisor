'use server';

import { z } from 'zod';

// 1. DATA STRUCTURE
const EventAdviceSchema = z.object({
  eventName: z.string(),
  date: z.string(),
  weatherForecast: z.string(),
  suggestedOutfitId: z.string().optional(),
  reasoning: z.string(),
  styleKeywords: z.array(z.string()),
});

// 2. THE EVENTS (Updated: Paris, New York, Oslo)
const FALLBACK_EVENTS = [
  {
    eventName: "Paris Fashion Week",
    date: "Feb 28, 2026 • 8:00 PM",
    weatherForecast: "Overcast, 12°C",
    suggestedOutfitId: "m1", 
    reasoning: "Parisian chic requires effortless layers. A leather jacket provides edge while keeping you warm against the Seine breeze.",
    styleKeywords: ["Chic", "Edgy", "Layered"]
  },
  {
    eventName: "New York Gala",
    date: "Mar 15, 2026 • 7:00 PM",
    weatherForecast: "Clear Night, 15°C",
    suggestedOutfitId: "m2",
    reasoning: "The NYC skyline calls for bold sophistication. A structured silhouette stands out against the city lights.",
    styleKeywords: ["Bold", "Modern", "Structured"]
  },
  {
    eventName: "Oslo Design Summit",
    date: "Apr 10, 2026 • 9:00 AM",
    weatherForecast: "Rainy, 8°C",
    suggestedOutfitId: "m3",
    reasoning: "Scandinavian minimalism meets practicality. Tailored trousers look sharp for meetings and handle the cool damp weather well.",
    styleKeywords: ["Minimalist", "Practical", "Sharp"]
  }
];

export async function getUpcomingEventsStyleAdviceAction(closetItems: any[]) {
  console.log("🧥 Server Action: Analyzing style for", closetItems.length, "items");
  
  try {
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1000));
    return FALLBACK_EVENTS;
  } catch (error) {
    console.error("❌ AI Generation Failed:", error);
    return FALLBACK_EVENTS;
  }
}
