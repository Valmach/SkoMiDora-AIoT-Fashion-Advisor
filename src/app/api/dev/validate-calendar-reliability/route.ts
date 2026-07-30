import { NextResponse } from "next/server";

import {
  calendarEventAllowsSwimwear,
  getEventStyleKeywords,
  normalizeCalendarEvent,
  SWIMWEAR_KEYWORDS,
  type CalendarEventInput,
} from "@/lib/calendar-event-style";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertCondition(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export async function GET() {
  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 },
    );
  }

  try {
    const fixtures: CalendarEventInput[] = [
      {
        eventId: "paris-1",
        summary:
          "Paris Fashion Week",
        location: "Paris, France",
        start: {
          dateTime:
            "2026-07-30T09:00:00+02:00",
          timeZone: "Europe/Paris",
        },
      },
      {
        eventId: "oslo-1",
        summary:
          "Oslo Summer Summit",
        location: "Oslo, Norway",
        start: {
          dateTime:
            "2026-07-31T11:30:00+02:00",
          timeZone: "Europe/Oslo",
        },
      },
      {
        eventId: "rome-1",
        summary:
          "Rome Cultural Tour",
        location: "Rome, Italy",
        start: {
          dateTime:
            "2026-08-02T18:00:00+02:00",
          timeZone: "Europe/Rome",
        },
      },
    ];

    const normalized =
      fixtures.map(
        (fixture, index) => {
          const event =
            normalizeCalendarEvent(
              fixture,
              index,
            );

          assertCondition(
            event !== null,
            `Fixture ${index + 1} did not normalize.`,
          );

          assertCondition(
            event.eventDate.toISOString() ===
              new Date(
                String(
                  fixture.start
                    ?.dateTime,
                ),
              ).toISOString(),
            `${event.name} did not preserve its Calendar start date.`,
          );

          assertCondition(
            !calendarEventAllowsSwimwear(
              fixture,
            ),
            `${event.name} incorrectly allows swimwear.`,
          );

          const keywords =
            getEventStyleKeywords(
              fixture,
            );

          const staleKeywords =
            keywords.filter(
              keyword =>
                SWIMWEAR_KEYWORDS.some(
                  excluded =>
                    keyword
                      .toLowerCase()
                      .includes(
                        excluded.toLowerCase(),
                      ),
                ),
            );

          assertCondition(
            staleKeywords.length === 0,
            `${event.name} contains ineligible swimwear keywords.`,
          );

          assertCondition(
            !/\bspring\b|live june/i.test(
              event.name,
            ),
            `${event.name} contains stale seasonal language.`,
          );

          return {
            eventId: event.id,
            eventName: event.name,
            location:
              event.location,
            startDateTime:
              event.eventDate.toISOString(),
            allowsSwimwear: false,
          };
        },
      );

    const invalidEvent =
      normalizeCalendarEvent(
        {
          eventId: "invalid-1",
          summary:
            "Missing Date Event",
        },
        99,
      );

    assertCondition(
      invalidEvent === null,
      "An event without a date was not rejected.",
    );

    return NextResponse.json({
      ok: true,
      events: normalized,
      invalidDateRejected: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "Calendar reliability validation failed:",
      message,
    );

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
