import { NextResponse } from "next/server";

// Optional: enable logging
console.log("API Route Loaded: /api/eventWeather");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");

    if (!location || location.trim().length < 2) {
      return NextResponse.json(
        { error: "Invalid location" },
        { status: 400 }
      );
    }

    // Mock fallback data for now
    // TODO: Replace with real AccuWeather/Google Maps
    return NextResponse.json({
      temperature: 19,
      condition: "Clear Skies",
    });
  } catch (err: any) {
    console.error("Weather API Error:", err);
    return NextResponse.json(
      { error: "Weather Service Failed" },
      { status: 500 }
    );
  }
}
