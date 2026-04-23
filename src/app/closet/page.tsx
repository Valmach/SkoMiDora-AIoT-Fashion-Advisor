import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ⚠️ STRICT CLIENT BOUNDARY
// The ssr: false flag physically blocks the Next.js Node server from evaluating 
// the Firebase SDK imports inside the ClosetClient component.
const DigitalCloset = dynamic(() => import("./ClosetClient"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-40">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

export default function ClosetPage() {
  return <DigitalCloset />;
}