'use client';

import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Info } from 'lucide-react';
import WardrobeMedia from './WardrobeMedia';

interface ClosetItemProps {
  item: {
    id: string;
    name?: string;
    itemName?: string;
    imageUrl?: string;
    image?: string; 
    category?: string;
    color?: string;
    brand?: string;
    description?: string;
    notes?: string;
    size?: string;
  };
  onDelete?: (id: string) => void;
}

export default function ClosetItemCard({ item, onDelete }: ClosetItemProps) {
  const displayName = item.name || item.itemName || "Unnamed Item";
  const displayImage = item.imageUrl || item.image || "https://images.unsplash.com/photo-1551488852-7ef604b61880?w=500&q=60";
  const displayCategory = item.category || "General";
  const displayBrand = item.brand || "Unknown Brand";
  const displayNotes = item.description || item.notes || "";

  return (
    <Card className="group relative overflow-hidden bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all duration-300 flex flex-col h-full hover:shadow-xl">
      
      <div className="h-56 w-full bg-zinc-800 relative overflow-hidden border-b border-zinc-800">
        <WardrobeMedia
          src={displayImage}
          alt={displayName}
        />
        <div className="absolute top-2 right-2">
           <Badge variant="secondary" className="bg-black/70 backdrop-blur-sm text-white border-white/10 text-[10px] uppercase tracking-wider font-semibold">
             {displayCategory}
           </Badge>
        </div>
      </div>

      <CardContent className="p-4 flex-grow flex flex-col space-y-3">
        
        <div>
          <h3 className="text-lg font-bold text-white leading-tight mb-1 truncate">
            {displayName}
          </h3>
          <p className="text-xs text-[#DC143C] font-bold uppercase tracking-widest">
            {displayBrand}
          </p>
        </div>

        {displayNotes && (
          <div className="bg-zinc-950/50 p-2.5 rounded-md border border-zinc-800/50">
            <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
              {displayNotes}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-auto pt-1">
           {item.size && (
             <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 h-5 px-1.5">
               Size: {item.size}
             </Badge>
           )}
           {item.color && (
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded-full bg-zinc-950">
              <div className="w-2 h-2 rounded-full border border-zinc-700 shadow-sm" style={{ backgroundColor: item.color.toLowerCase() }} />
              {item.color}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-3 border-t border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
        <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-500 hover:text-white px-2">
          <Info size={12} className="mr-1.5" /> Details
        </Button>
        
        {onDelete && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7 text-zinc-600 hover:text-red-500 hover:bg-red-950/20"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 size={14} />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
