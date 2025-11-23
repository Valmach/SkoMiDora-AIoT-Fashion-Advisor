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
import { Sparkles, Star, CalendarDays } from "lucide-react";

type OutfitCardProps = {
  outfit: any;
  index: number;
  eventDetails?: any;
  styleDNA?: string | null;
  analyzedItems?: any[];
};

export default function OutfitCard({
  outfit,
  index,
  eventDetails,
  styleDNA,
}: OutfitCardProps) {
  const title =
    outfit?.label ||
    outfit?.title ||
    `Outfit Recommendation #${(index ?? 0) + 1}`;

  const score =
    typeof outfit?.score === "number"
      ? Math.round(outfit.score * 100)
      : undefined;

  const primaryEvent =
    eventDetails?.summary || outfit?.eventType || "Upcoming occasion";

  const description =
    outfit?.narrative ||
    outfit?.description ||
    "Here is a curated outfit suggestion based on your wardrobe and style preferences.";

  const shoes =
    outfit?.shoes ||
    outfit?.shoeItems ||
    outfit?.footwear ||
    [];

  const clothes =
    outfit?.clothing ||
    outfit?.clothingItems ||
    outfit?.apparel ||
    [];

  return (
    <Card className="w-full shadow-md border border-border/60">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </div>

          {typeof score === "number" && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{score}</span>
              <span className="text-muted-foreground">/ 100</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{primaryEvent}</span>
        </div>

        {styleDNA && (
          <CardDescription className="text-xs leading-relaxed">
            Styled to align with your current Style DNA profile:{" "}
            <span className="font-medium text-foreground">{styleDNA}</span>
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-foreground leading-relaxed">
          {description}
        </p>

        {Array.isArray(shoes) && shoes.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Shoes
            </div>
            <div className="flex flex-wrap gap-2">
              {shoes.map((shoe: any, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {shoe?.displayName ||
                    shoe?.name ||
                    shoe?.label ||
                    shoe?.brand ||
                    "Footwear item"}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(clothes) && clothes.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Clothing & Accessories
            </div>
            <div className="flex flex-wrap gap-2">
              {clothes.map((item: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {item?.displayName ||
                    item?.name ||
                    item?.label ||
                    item?.category ||
                    "Wardrobe item"}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2">
        <Button size="sm" variant="outline">View details</Button>
        <Button size="sm" className="gap-1">
          <Sparkles className="h-4 w-4" />
          Regenerate
        </Button>
      </CardFooter>
    </Card>
  );
}
