import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get("location") || "Paris, France";
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      hasWeatherApiKey: false,
      location,
      error: "Missing WEATHER_API_KEY in App Hosting runtime",
    }, { status: 500 });
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text.slice(0, 500);
    }

    return NextResponse.json({
      ok: response.ok,
      hasWeatherApiKey: true,
      location,
      upstreamStatus: response.status,
      upstreamStatusText: response.statusText,
      sample: response.ok
        ? {
            temp_c: data?.main?.temp,
            condition: data?.weather?.[0]?.description,
            city: data?.name,
          }
        : data,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      hasWeatherApiKey: true,
      location,
      error: error?.message || "Unknown OpenWeather fetch failure",
    }, { status: 500 });
  }
}
