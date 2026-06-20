'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Loader2, Sparkles, Cpu, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Outfit, Imperial_Script } from "next/font/google"; 

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "700"] });
const imperial = Imperial_Script({ subsets: ["latin"], weight: ["400"] });

export default function StylistPage() {
  const searchParams = useSearchParams();
  const eventName = searchParams.get('event');
  const weather = searchParams.get('weather');

  const { toast } = useToast();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [hardwareSyncStatus, setHardwareSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');

  // NEW: State for manual entry when URL params are missing
  const [manualEventInput, setManualEventInput] = useState("");
  const [displayEventName, setDisplayEventName] = useState(eventName || "");

  // Automatically trigger the Gemini AI if an event was passed from the Calendar
  useEffect(() => {
    if (eventName) {
      generateStylingAndHardwareConfig(eventName, weather || "Unknown");
    }
  }, [eventName, weather]);

  const generateStylingAndHardwareConfig = async (event: string, eventWeather: string) => {
    setIsGenerating(true);
    setHardwareSyncStatus('idle');
    setDisplayEventName(event); // Update the header to show the current event
    
    try {
      // NOTE: In production, move this fetch to a Next.js Server Action to hide the API key
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""; 
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      const promptText = `
        The user is attending: "${event}". The weather is: "${eventWeather}".
        1. Recommend a high-end luxury outfit from their digital closet.
        2. Assign a hex color code for the SkoMiDora smart shoebox's internal LED Aura to match the event's vibe.
      `;

      const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: "Return strictly JSON: { 'outfit': 'string', 'ledColor': '#hexcode', 'vibe': 'string' }" }] },
        generationConfig: { responseMimeType: "application/json" }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const resultData = JSON.parse(data.candidates[0].content.parts[0].text);
      
      setAiResponse(resultData);
      
      // Immediately push this configuration to Firestore for the ESP32-S3 to read
      await syncToShoeboxHardware(resultData.ledColor, event);

    } catch (error) {
      console.error("AI Generation Error:", error);
      toast({ title: "Error", description: "Failed to generate styling.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const syncToShoeboxHardware = async (hexColor: string, event: string) => {
    setHardwareSyncStatus('syncing');
    try {
      if (!firestore) throw new Error("Firestore not initialized");
      
      // Write to a specific document that the ESP32-S3 listens to
      const hardwareRef = doc(firestore, 'shoeboxHardware', 'currentActiveState');
      
      await setDoc(hardwareRef, {
        activeEvent: event,
        ledAuraHex: hexColor,
        isSynced: true,
        updatedAt: new Date().toISOString()
      });

      setHardwareSyncStatus('success');
      toast({ title: "Hardware Synced", description: "SkoMiDora Box Aura calibrated.", style: { backgroundColor: '#111', color: '#fff' }});
      
    } catch (error) {
      console.error("Firestore Sync Error:", error);
      setHardwareSyncStatus('idle');
      toast({ title: "Sync Failed", description: "Could not connect to Shoebox hardware.", variant: "destructive" });
    }
  };

  return (
    <div className={`min-h-screen bg-black text-white p-6 md:p-12 ${outfit.className}`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="border-b border-zinc-900 pb-8 mb-8">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">
            <span className="text-[#9A1B22]">●</span> AI Concierge
          </div>
          <h1 className={`text-5xl md:text-6xl font-normal tracking-wide ${imperial.className}`}> 
            <span className="text-white">Curated for </span>
            <span className="text-[#9A1B22]">{displayEventName || "You"}</span>
          </h1>
        </div>

        {/* 1. MANUAL ENTRY STATE (Fixes the blank page when navigating from sidebar) */}
        {!isGenerating && !aiResponse && (
          <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-sm animate-in fade-in duration-500">
            <h3 className="text-zinc-400 text-xs uppercase tracking-[0.2em] mb-6">Describe Your Occasion</h3>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="e.g., Yacht Party in Monaco, Business Dinner..."
                className="flex-1 bg-black border border-zinc-800 p-4 text-white text-sm focus:outline-none focus:border-[#9A1B22] transition-colors rounded-none placeholder:text-zinc-600"
                value={manualEventInput}
                onChange={(e) => setManualEventInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualEventInput.trim()) {
                    generateStylingAndHardwareConfig(manualEventInput, "Unknown");
                  }
                }}
              />
              <Button 
                onClick={() => generateStylingAndHardwareConfig(manualEventInput, "Unknown")}
                disabled={!manualEventInput.trim()}
                className="bg-[#9A1B22] text-white hover:bg-[#7A151B] uppercase tracking-[0.2em] text-xs py-7 px-8 rounded-none transition-all"
              >
                <Sparkles className="w-4 h-4 mr-2" /> Style Event
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <Sparkles className="h-12 w-12 text-[#9A1B22] animate-pulse" />
            <p className="text-zinc-500 text-xs uppercase tracking-[0.2em] font-medium">Analyzing Wardrobe & Event Context...</p>
          </div>
        )}

        {/* Results */}
        {aiResponse && !isGenerating && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Outfit Recommendation */}
            <div className="md:col-span-2 bg-zinc-950 border border-zinc-800 p-8 rounded-sm shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: aiResponse.ledColor }}></div>
               <h3 className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-4">AI Stylist Recommendation</h3>
               <p className="text-lg text-zinc-200 leading-relaxed font-light">{aiResponse.outfit}</p>
               
               <div className="mt-8 pt-6 border-t border-zinc-900 flex justify-between items-center">
                 <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Event Vibe</span>
                 <span className="text-xs text-white font-medium italic">"{aiResponse.vibe}"</span>
               </div>
            </div>

            {/* Hardware Sync Status Panel */}
            <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Cpu size={14} className="text-[#00A896]" /> Box Hardware
                </h3>

                <div className="flex items-center gap-4 mb-6">
                  <div 
                    className="w-12 h-12 rounded-full border border-zinc-700 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    style={{ backgroundColor: aiResponse.ledColor, boxShadow: `0 0 20px ${aiResponse.ledColor}50` }}
                  />
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">LED Aura Calibrated</p>
                    <p className="text-sm font-mono text-zinc-300">{aiResponse.ledColor}</p>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="bg-black border border-zinc-900 p-4 rounded-sm flex items-center gap-3">
                {hardwareSyncStatus === 'syncing' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                {hardwareSyncStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-[#00A896]" />}
                
                <span className={`text-[10px] uppercase tracking-widest font-mono ${hardwareSyncStatus === 'success' ? 'text-[#00A896]' : 'text-zinc-500'}`}>
                  {hardwareSyncStatus === 'syncing' ? 'Syncing to ESP32...' : 'Hardware Synced'}
                </span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}