import type {
  AnalyzeStyleDNAInput,
  RecommendOutfitInput,
  AnalyzedItem,
  GoogleCalendarEvent,
} from "@/types";

const now = Date.now();
const oneHour = 60 * 60 * 1000;
const oneDay = 24 * oneHour;

/* ============================================================
   MOCK: AnalyzeStyleDNAInput (raw/serialized strings)
============================================================ */

export const mockAnalyzeStyleDNAInput: AnalyzeStyleDNAInput = {
  wardrobeData:
    "Burberry trench coat (beige), Gucci silk blouse (cream), Saint Laurent leather pants (black), Loro Piana cashmere sweater (grey), Max Mara linen dress (white), Bottega Veneta knit cardigan (brown).",

  shoeCollectionData:
    "Chanel slingbacks (beige/black), Manolo Blahnik Hangisi pumps (blue satin), Hermès Oran sandals (gold), Gucci Princetown loafers (black leather), Golden Goose Superstar sneakers (white), Christian Louboutin So Kate pumps (nude patent).",

  styleQuestions: [
    "Do you prefer tailored or relaxed silhouettes?",
    "Are you drawn more to neutral tones or bold colours?",
    "Do you prioritise comfort or statement pieces?",
  ],

  currentStyleDNA:
    "Sophisticated chic with modern minimalist influences. Strong preference for luxury materials and timeless silhouettes.",

  googleCalendarEvents: [
    {
      eventName: "Team Sync Meeting",
      eventStartDateTime: new Date(now + oneDay).toISOString(),
      eventEndDateTime: new Date(now + oneDay + oneHour).toISOString(),
      eventType: "business",
      eventLocation: "10 Downing Street, London",
      eventCountry: "UK",
    },
    {
      eventName: "Art Gallery Opening",
      eventStartDateTime: new Date(now + 2 * oneDay + 2 * oneHour).toISOString(),
      eventEndDateTime: new Date(now + 2 * oneDay + 4 * oneHour).toISOString(),
      eventType: "social chic",
      eventLocation: "Museum of Modern Art, New York",
      eventCountry: "USA",
    },
  ] as GoogleCalendarEvent[],
};

/* ============================================================
   MOCK: Structured wardrobe (AnalyzedItem[])
   Used by RecommendOutfitInput
============================================================ */

export const mockAnalyzedWardrobe: AnalyzedItem[] = [
  {
    id: "item-1",
    itemName: "Burberry Trench Coat",
    itemType: "outerwear",
    color: "beige",
    description: "Classic trench coat with a tailored silhouette.",
    narrativeDescription: "A timeless beige trench that elevates any look.",
    imageUrl: "/event-placeholder.jpg",
    imagePath: "wardrobe/burberry-trench.jpg",
    createdAt: new Date().toISOString(),
    styleKeywords: ["classic", "tailored", "luxury"],
  },
  {
    id: "item-2",
    itemName: "Gucci Silk Blouse",
    itemType: "top",
    color: "cream",
    description: "Silk blouse, elegant drape.",
    narrativeDescription: "A cream silk blouse for polished sophistication.",
    imageUrl: "/event-placeholder.jpg",
    imagePath: "wardrobe/gucci-silk-blouse.jpg",
    createdAt: new Date().toISOString(),
    styleKeywords: ["elegant", "minimal", "luxury"],
  },
  {
    id: "item-3",
    itemName: "Saint Laurent Leather Pants",
    itemType: "bottom",
    color: "black",
    description: "Leather trousers with a modern cut.",
    narrativeDescription: "Black leather trousers with a sharp, modern edge.",
    imageUrl: "/event-placeholder.jpg",
    imagePath: "wardrobe/saint-laurent-leather-pants.jpg",
    createdAt: new Date().toISOString(),
    styleKeywords: ["edgy", "modern", "statement"],
  },
];

/* ============================================================
   MOCK → RecommendOutfitInput
============================================================ */

export const getMockRecommendOutfitInput = (
  stylePreferences?: string,
  eventIndex: number = 0,
  wardrobeOverride?: AnalyzedItem[],
  shoeCollectionOverride?: string[]
): RecommendOutfitInput => {
  const events =
    mockAnalyzeStyleDNAInput.googleCalendarEvents as GoogleCalendarEvent[];

  const calendarEvent = events[eventIndex % events.length];

  const startDate = new Date(calendarEvent.eventStartDateTime);
  const endDate = new Date(calendarEvent.eventEndDateTime);

  const formatDate = (date: Date) => {
    return date.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  let eventDetails = `Upcoming event: ${calendarEvent.eventName} (${calendarEvent.eventType}) from ${formatDate(
    startDate
  )} to ${formatDate(endDate)}.`;

  if (calendarEvent.eventLocation) {
    eventDetails += ` Location: ${calendarEvent.eventLocation}.`;
  }

  return {
    wardrobeData: wardrobeOverride ?? mockAnalyzedWardrobe,

    shoeCollection:
      shoeCollectionOverride ?? [
        "Chanel slingbacks",
        "Manolo Blahnik Hangisi pumps",
        "Hermès Oran sandals",
        "Gucci Princetown loafers",
      ],

    eventDetails,

    weatherConditions:
      "Current weather: 22°C, partly cloudy with a chance of showers.",

    stylePreferences:
      stylePreferences ?? mockAnalyzeStyleDNAInput.currentStyleDNA,
  };
};
