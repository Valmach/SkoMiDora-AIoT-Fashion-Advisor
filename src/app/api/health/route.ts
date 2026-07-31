import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight status endpoint. Primary purpose right now is exposing which
// commit is actually live, since the deployed site previously had no way to
// answer that without checking Firebase Console Rollouts manually.
export async function GET() {
  return NextResponse.json({
    ok: true,
    commitSha: process.env.NEXT_PUBLIC_COMMIT_SHA || "unknown",
    timestamp: new Date().toISOString(),
  });
}
