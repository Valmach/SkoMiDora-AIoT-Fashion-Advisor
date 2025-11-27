
import type { AnalyzeStyleDNAInput } from "@/types";
import type { RecommendOutfitInput } from "@/types";

const now = Date.now();
const oneHour = 60 * 60 * 1000;
const oneDay = 24 * oneHour;

export const mockAnalyzeStyleDNAInput: AnalyzeStyleDNAInput = {
  wardrobeData:
    "RFID_Tags: Item_1_Burberry_TrenchCoat_Beige_SizeM, Item_2_Gucci_SilkBlouse_Cream_SizeS, Item_3_SaintLaurent_LeatherPants_Black_Size30, Item_4_LoroPiana_CashmereSweater_Grey_SizeM, Item_5_MaxMara_LinenDress_White_SizeM, Item_6_BottegaVeneta_KnitCardigan_Brown_SizeM",
  shoeCollectionData:
    "NFC_Tags: Shoe_1_Chanel_Slingbacks_BeigeBlack_Size39, Shoe_2_ManoloBlahnik_HangisiPumps_BlueSatin_Size39, Shoe_3_Hermes_OranSandals_Gold_Size39, Shoe_4_Gucci_PrincetownSlippers_Leather_Black_Size39, Shoe_5_GoldenGoose_SuperstarSneakers_WhiteDistressed_Size39, Shoe_6_ChristianLouboutin_SoKatePumps_NudePatent_Size39",
  accuWeatherInfo: {
    temperature: 22,
    condition: "Partly cloudy with a chance of showers",
  },
  googleCalendarEvents: [
    {
      eventName: "Team Sync Meeting",
      eventStartDateTime: new Date(now + oneDay),
      eventEndDateTime: new Date(now + oneDay + oneHour),
      eventType: "business",
      eventLocation: "10 Downing Street, London",
    },
    {
      eventName: "Art Gallery Opening",
      eventStartDateTime: new Date(
        now + 2 * oneDay + 2 * oneHour,
      ),
      eventEndDateTime: new Date(now + 2 * oneDay + 4 * oneHour),
      eventType: "social chic",
      eventLocation: "Museum of Modern Art, New York",
    },
    {
      eventName: "Weekend Charity Gala",
      eventStartDateTime: new Date(
        now + 3 * oneDay + 19 * oneHour,
      ),
      eventEndDateTime: new Date(now + 3 * oneDay + 23 * oneHour),
      eventType: "formal black-tie",
      eventLocation: "The Plaza Hotel, New York City",
    },
    {
      eventName: "Client Presentation",
      eventStartDateTime: new Date(
        now + 4 * oneDay + 10 * oneHour,
      ),
      eventEndDateTime: new Date(
        now + 4 * oneDay + 11 * oneHour + 30 * 60000,
      ),
      eventType: "business professional",
      eventLocation: "Salesforce Tower, San Francisco",
    },
    {
      eventName: "Fashion Week Show",
      eventStartDateTime: new Date(
        now + 5 * oneDay + 15 * oneHour,
      ),
      eventEndDateTime: new Date(now + 5 * oneDay + 16 * oneHour),
      eventType: "fashion event",
      eventLocation: "Spring Studios, NYC",
    },
    {
      eventName: "Weekend Brunch with Friends",
      eventStartDateTime: new Date(
        now + 6 * oneDay + 11 * oneHour,
      ),
      eventEndDateTime: new Date(now + 6 * oneDay + 13 * oneHour),
      eventType: "social brunch",
      eventLocation: "The Ivy Chelsea Garden, London",
    },
  ],
};

// Updated to accept user's actual wardrobe and shoe collection data
export const getMockRecommendOutfitInput = (
  styleDna?: string,
  eventIndex: number = 0,
  userWardrobeData?: string,
  userShoeCollectionData?: string,
): RecommendOutfitInput => {
  const calendarEvent =
    mockAnalyzeStyleDNAInput.googleCalendarEvents[
      eventIndex % mockAnalyzeStyleDNAInput.googleCalendarEvents.length
    ];

  const startDate = new Date(calendarEvent.eventStartDateTime);
  const endDate = new Date(calendarEvent.eventEndDateTime);

  const formatDate = (date: Date) => {
    return date.toLocaleString(undefined, {
      // Using undefined for locale to use browser's default
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  let eventDetailsString = `Upcoming event: ${calendarEvent.eventName} (${calendarEvent.eventType}) from ${formatDate(startDate)} to ${formatDate(endDate)}.`;
  if (calendarEvent.eventLocation) {
    eventDetailsString += ` Location: ${calendarEvent.eventLocation}.`;
  }

  return {
    shoeCollection:
      userShoeCollectionData || mockAnalyzeStyleDNAInput.shoeCollectionData,
    wardrobeData: userWardrobeData || mockAnalyzeStyleDNAInput.wardrobeData,
    eventDetails: eventDetailsString,
    weatherConditions: `Current weather: ${mockAnalyzeStyleDNAInput.accuWeatherInfo.temperature}°C, ${mockAnalyzeStyleDNAInput.accuWeatherInfo.condition}.`,
    stylePreferences:
      styleDna ||
      "Prefers sophisticated chic and modern minimalist styles. Values high-quality materials like silk, cashmere, and fine leather. Enjoys designer pieces from Chanel, Gucci, Saint Laurent, Loro Piana, Max Mara. Color palette includes neutrals, rich jewel tones, and occasional bold accents. Footwear is a key statement.",
  };
};
