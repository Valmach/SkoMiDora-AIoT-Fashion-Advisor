"use client";

import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { useState } from "react";

export default function CalendarConnectButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) {
        throw new Error(
          "Please sign in before connecting Google Calendar.",
        );
      }

      toast({
        title: "Connecting to Google…",
        description: "Preparing secure Google Calendar authorization...",
      });

      const idToken = await user.getIdToken();

      const res = await fetch("/api/google-calendar/auth", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        cache: "no-store",
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          payload?.error ||
            `Google Calendar authorization failed with status ${res.status}.`,
        );
      }

      if (
        typeof payload?.authUrl !== "string" ||
        !payload.authUrl.startsWith("https://")
      ) {
        throw new Error(
          "Google Calendar authorization URL was not returned.",
        );
      }

      window.location.assign(payload.authUrl);
    } catch (err) {
      console.error("Google Calendar connection failed:", err);

      toast({
        title: "Connection Failed",
        description:
          err instanceof Error
            ? err.message
            : "Could not connect to Google Calendar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
        onClick={handleConnect}
        disabled={loading}
        variant="outline"
        className="h-9 shrink-0 rounded-none border-white/70 bg-black px-4 text-[10px] font-medium uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:border-[#9A1B22] hover:bg-[#9A1B22] hover:text-white"
      >
      <CalendarDays className="h-4 w-4 mr-2" />
      {loading ? "Connecting…" : "Connect Google Calendar"}
    </Button>
  );
}
