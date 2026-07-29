"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductSpinImage } from "@/components/ProductSpinImage";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

interface ProductImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  images?: string[];
  alt: string;
}

export function ProductImageLightbox({
  open,
  onOpenChange,
  imageUrl,
  images,
  alt,
}: ProductImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null
  );

  // Reset zoom/pan every time the lightbox opens, rather than carrying state
  // over between products.
  useEffect(() => {
    if (open) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open]);

  const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

  const zoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP));
  const zoomOut = () =>
    setZoom((z) => {
      const next = clampZoom(z - ZOOM_STEP);
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    setZoom((z) => {
      const next = clampZoom(z + direction * 0.25);
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (zoom <= MIN_ZOOM) return; // only pan when zoomed in
    dragState.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.x;
    const dy = e.clientY - dragState.current.y;
    setPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy });
  };

  const stopDragging = () => {
    dragState.current = null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl w-[90vw] h-[80vh] bg-[#1a1512] border-zinc-800 p-0 overflow-hidden"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>

        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <button
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="p-2 bg-black/80 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:border-zinc-700 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="px-3 py-2 bg-black/80 border border-zinc-700 text-[10px] uppercase tracking-widest text-zinc-500 flex items-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="p-2 bg-black/80 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:border-zinc-700 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        <div
          className="w-full h-full flex items-center justify-center overflow-hidden select-none"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          onDoubleClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          style={{ cursor: zoom > 1 ? "grab" : "default" }}
        >
          <div
            className="aspect-[3/2]"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: dragState.current ? "none" : "transform 150ms ease-out",
              width: "88%",
              maxHeight: "88%",
              pointerEvents: zoom > 1 ? "none" : "auto",
            }}
          >
            <ProductSpinImage imageUrl={imageUrl} images={images} alt={alt} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
