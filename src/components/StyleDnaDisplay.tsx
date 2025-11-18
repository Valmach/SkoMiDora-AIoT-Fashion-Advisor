import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dna, Brain } from "lucide-react";

interface StyleDnaDisplayProps {
  styleDNA: string | null;
}

export default function StyleDnaDisplay({ styleDNA }: StyleDnaDisplayProps) {
  if (!styleDNA) {
    return null;
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium text-foreground">
          Your Style DNA
        </CardTitle>
        <Dna className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="flex items-start space-x-3">
          <Brain className="h-8 w-8 text-muted-foreground mt-1 flex-shrink-0" />
          <p className="text-sm text-foreground leading-relaxed">{styleDNA}</p>
        </div>
        <CardDescription className="mt-4 text-xs text-muted-foreground">
          This analysis is based on your wardrobe, shoe collection, and upcoming
          events.
        </CardDescription>
      </CardContent>
    </Card>
  );
}
