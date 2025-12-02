"use client";

import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function CalendarConnectButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);
      toast({
        title: "Connecting to Google…",
        description: "Redirecting to Google Calendar login...",
      });

      const res = await fetch("/api/google-calendar/auth");
      const { authUrl } = await res.json();
      window.location.href = authUrl;
    } catch (err) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to Google Calendar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleConnect} disabled={loading}>
      <CalendarDays className="h-4 w-4 mr-2" />
      {loading ? "Connecting…" : "Connect Google Calendar"}
    </Button>
  );
}
