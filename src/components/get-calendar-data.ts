'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const schema = z.object({
  recommendations: z.array(
    z.object({
      id: z.string().optional(),
      eventName: z.string(),
      eventStartDateTime: z.string(),
      location: z.string(),
      weatherCondition: z.string(),
      temperature: z.number(),
      outfitIdea: z.string(),
      reasoning: z.string(),
      items: z.array(z.string()),
      colorPalette: z.string(),
    })
  ),
});

export async function getUpcomingEventsStyleAdviceAction(eventsInput: any[] = []) {
  
  // 1. If we have real events, use AI to generate.
  if (eventsInput.length > 0) {
    // ... (Standard AI logic for real events would go here)
    // For now, we default to the simulation below if the input is empty
  }

  // 2. FORCED SIMULATION: Paris, Oslo, London with YOUR EXACT TEXT
  // We return this directly to ensure the text is 100% accurate.
  return [
    {
      eventName: "Paris", // Card Title Overridden in Page
      eventStartDateTime: "Tomorrow, 8:00 PM",
      location: "Paris, France",
      weatherCondition: "Mild Evening",
      temperature: 65,
      outfitIdea: "Parisian Chic",
      reasoning: "The Oynx slip dress offers a versatile base for layering, achieving a chic yet comfortable aesthetic for Parisian exploration. Paired with polished loafers, it ensures both style and ease for walking the city's charming streets.",
      items: ["Oynx Slip Dress", "Polished Loafers", "Minimalist Trench", "Gold Hoops"],
      colorPalette: "Black, White, Gold"
    },
    {
      eventName: "Oslo",
      eventStartDateTime: "Friday, 9:00 AM",
      location: "Oslo, Norway",
      weatherCondition: "Frosty & Cold",
      temperature: 28,
      outfitIdea: "Nordic Warmth",
      reasoning: "The Bordeaux Virgin Wool flare pants provide essential warmth and insulation for Oslo's cold climate. The Miu Miu leather boots offer robust protection and style, perfectly suited for frosty conditions while maintaining a chic appeal.",
      items: ["Bordeaux Wool Pants", "Miu Miu Leather Boots", "Cream Turtleneck", "Shearling Coat"],
      colorPalette: "Bordeaux, Cream, Brown"
    },
    {
      eventName: "London",
      eventStartDateTime: "Sunday, 7:00 PM",
      location: "London, UK",
      weatherCondition: "Rainy",
      temperature: 52,
      outfitIdea: "Gallery Hopping",
      reasoning: "The charcoal grey dress offers a sophisticated and adaptable base, ideal for layering under a warm coat. Black leather Tabi boots are chosen for their rain-appropriate material and comfort, making them perfect for walking between galleries in unpredictable London weather.",
      items: ["Charcoal Grey Dress", "Black Tabi Boots", "Rain Mac", "Silver Clutch"],
      colorPalette: "Charcoal, Black, Silver"
    }
  ];
}