import { NextResponse } from "next/server";
import { getUpcomingEventsStyleAdviceAction } from "@/app/actions/get-calendar-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const events =
    await getUpcomingEventsStyleAdviceAction([], []);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    events,
  });
}
