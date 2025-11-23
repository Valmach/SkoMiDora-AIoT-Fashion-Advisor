"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Sparkles } from "lucide-react";

type UpcomingEventAdviceCardProps = {
  event: any;
  advice: any;
  index: number;
};

export default function UpcomingEventAdviceCard({
  event,
  advice,
  index,
}: UpcomingEventAdviceCardProps) {
  const title =
    event?.summary ||
    advice?.title ||
    `Upcoming Event #${(index ?? 0) + 1}`;

  const when =
    event?.start?.dateTime ||
    event?.start?.date ||
    advice?.when ||
    "Upcoming date";

  const location = event?.location || advice?.location || null;

  const eventType =
    advice?.eventType ||
    event?.eventType ||
    "General event";

  const narrative =
    advice?.narrative ||
    advice?.description ||
    advice?.text ||
    "AI styling guidance for this event will appear here.";

  const keyIdeas: string[] =
    advice?.keyIdeas ||
    advice?.highlights ||
    [];

  return (
    <Card className="w-full shadow-md border border-border/60">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {eventType}
          </Badge>
        </div>

        <CardDescription className="text-xs text-muted-foreground space-y-1">
          <div>{when}</div>
          {location && <div>{location}</div>}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-foreground leading-relaxed">
          {narrative}
        </p>

        {Array.isArray(keyIdeas) && keyIdeas.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Key style focus
            </div>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              {keyIdeas.map((idea, i) => (
                <li key={i}>{idea}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button size="sm" variant="outline">View in Calendar</Button>
        <Button size="sm" className="gap-1">
          <Sparkles className="h-4 w-4" />
          Refine Advice
        </Button>
      </CardFooter>
    </Card>
  );
}
