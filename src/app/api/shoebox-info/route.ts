import { NextResponse } from "next/server";

export async function GET() {
  // console.log("Minimal shoebox-info API route hit"); // Optional: for checking if API route itself is callable later
  return NextResponse.json({ message: "Shoebox info API route is minimal" });
}
