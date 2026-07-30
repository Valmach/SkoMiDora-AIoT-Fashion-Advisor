export type CalendarEventInput = {
  eventId?: string | null;
  id?: string | null;
  summary?: string | null;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  location?: string | null;
  start?: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
  startDateTime?: string | null;
  date?: string | null;
};

export type NormalizedCalendarEvent = {
  id: string;
  name: string;
  description: string;
  location: string;
  eventDate: Date;
  keywords: string[];
  cityBg: string;
};

export const SWIMWEAR_KEYWORDS = [
  "bikini",
  "swimwear",
  "swimsuit",
  "swim suit",
  "bathing suit",
  "beachwear",
  "poolwear",
  "pool wear",
  "cover-up",
  "coverup",
] as const;

const DEFAULT_STYLE_KEYWORDS = [
  "linen",
  "cotton",
  "silk",
  "dress",
  "shirt",
  "blouse",
  "trousers",
  "skirt",
  "tailored",
  "loafer",
  "flat",
  "mule",
  "sandal",
  "sneaker",
  "lightweight",
];

const CITY_IMAGES: Record<string, string> = {
  paris:
    "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1200&auto=format&fit=crop",
  oslo:
    "https://plus.unsplash.com/premium_photo-1697729974131-40aabc4817c0?q=80&w=1200&auto=format&fit=crop",
  rome:
    "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1200&auto=format&fit=crop",
  london:
    "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop",
  default:
    "https://images.unsplash.com/photo-1473625247510-8ceb1760943f?q=80&w=1200&auto=format&fit=crop",
};

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCalendarDate(
  event: CalendarEventInput,
): Date | null {
  const dateTime =
    cleanText(event.start?.dateTime) ||
    cleanText(event.startDateTime);

  if (dateTime) {
    const parsedDateTime = new Date(dateTime);

    return Number.isNaN(parsedDateTime.getTime())
      ? null
      : parsedDateTime;
  }

  const allDayDate =
    cleanText(event.start?.date) ||
    cleanText(event.date);

  if (!allDayDate) {
    return null;
  }

  const parsedAllDay = new Date(
    `${allDayDate}T12:00:00`,
  );

  return Number.isNaN(parsedAllDay.getTime())
    ? null
    : parsedAllDay;
}

export function calendarEventAllowsSwimwear(
  event: CalendarEventInput,
): boolean {
  const context = [
    event.summary,
    event.title,
    event.name,
    event.description,
    event.location,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(beach|pool|swim|swimming|resort|cruise|yacht|seaside|water park)\b/.test(
    context,
  );
}

export function getEventStyleKeywords(
  event: CalendarEventInput,
): string[] {
  const context = [
    event.summary,
    event.title,
    event.name,
    event.description,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const keywords = [...DEFAULT_STYLE_KEYWORDS];

  if (
    /\b(conference|meeting|summit|business|office|client)\b/.test(
      context,
    )
  ) {
    keywords.push(
      "blazer",
      "tailored",
      "trousers",
      "loafer",
      "pump",
    );
  }

  if (
    /\b(tour|walking|museum|sightseeing|travel)\b/.test(
      context,
    )
  ) {
    keywords.push(
      "sneaker",
      "loafer",
      "flat",
      "comfortable",
    );
  }

  if (
    /\b(dinner|gala|formal|wedding|reception|cocktail)\b/.test(
      context,
    )
  ) {
    keywords.push(
      "dress",
      "silk",
      "tailored",
      "pump",
      "heel",
    );
  }

  if (calendarEventAllowsSwimwear(event)) {
    keywords.push(
      "swimwear",
      "swimsuit",
      "cover-up",
      "sandal",
    );
  }

  return Array.from(new Set(keywords));
}

export function backgroundForCalendarEvent(
  event: CalendarEventInput,
): string {
  const context = [
    event.location,
    event.summary,
    event.title,
    event.name,
  ]
    .map(cleanText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const city = Object.keys(CITY_IMAGES).find(
    key =>
      key !== "default" &&
      context.includes(key),
  );

  return CITY_IMAGES[city || "default"];
}

export function normalizeCalendarEvent(
  event: CalendarEventInput,
  index: number,
): NormalizedCalendarEvent | null {
  const eventDate = parseCalendarDate(event);

  if (!eventDate) {
    return null;
  }

  const name =
    cleanText(event.summary) ||
    cleanText(event.title) ||
    cleanText(event.name) ||
    "Upcoming Event";

  return {
    id:
      cleanText(event.eventId) ||
      cleanText(event.id) ||
      `calendar-event-${index}`,
    name,
    description: cleanText(event.description),
    location: cleanText(event.location),
    eventDate,
    keywords: getEventStyleKeywords(event),
    cityBg: backgroundForCalendarEvent(event),
  };
}

export function getSeasonForLatitude(
  date: Date,
  latitude: number | null,
): "Winter" | "Spring" | "Summer" | "Fall" {
  const month = date.getMonth() + 1;
  const northern =
    latitude === null || latitude >= 0;

  if (northern) {
    if ([12, 1, 2].includes(month)) {
      return "Winter";
    }

    if ([3, 4, 5].includes(month)) {
      return "Spring";
    }

    if ([6, 7, 8].includes(month)) {
      return "Summer";
    }

    return "Fall";
  }

  if ([12, 1, 2].includes(month)) {
    return "Summer";
  }

  if ([3, 4, 5].includes(month)) {
    return "Fall";
  }

  if ([6, 7, 8].includes(month)) {
    return "Winter";
  }

  return "Spring";
}

export function formatCalendarEventDate(
  date: Date,
): string {
  const eventDate = date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );

  const eventTime = date.toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  );

  return `${eventDate} • ${eventTime}`;
}

export function formatEventMonthYear(
  date: Date,
): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
