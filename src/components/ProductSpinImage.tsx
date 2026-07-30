"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";

interface ProductSpinImageProps {
  imageUrl: string;
  images?: string[];
  alt: string;
  className?: string;
}

/**
 * Shows a static image when there's nothing to spin (0 or 1 frames).
 * When 2+ frames are provided, hovering (desktop) scrubs through them based
 * on horizontal cursor position, simulating a 360 turntable view. Touch
 * devices don't get hover, so they fall back to the primary frame - a
 * tap-to-scrub mode can be layered on later if needed.
 */
export function ProductSpinImage({
  imageUrl,
  images,
  alt,
  className = "",
}: ProductSpinImageProps) {
  const frames = images && images.length > 1 ? images : null;
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  // Preload every frame once, so scrubbing doesn't flicker on first hover.
  useEffect(() => {
    if (!frames) return;
    frames.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [frames]);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!frames || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const index = Math.min(
      frames.length - 1,
      Math.floor(ratio * frames.length)
    );

    setFrameIndex(index);
  };

  const activeSrc = frames ? frames[frameIndex] : imageUrl;

  if (!activeSrc) {
    return (
      <div className={`flex flex-col items-center justify-center text-zinc-800 ${className}`}>
        <ImageOff className="h-6 w-6 mb-2 opacity-50" />
        <span className="text-[10px] uppercase tracking-widest">No image</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => frames && setIsSpinning(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setIsSpinning(false);
        setFrameIndex(0);
      }}
      className={`relative w-full h-full ${frames ? "cursor-ew-resize" : ""} ${className}`}
    >
      <img
        src={activeSrc}
        alt={alt}
        className="w-full h-full object-contain drop-shadow-2xl select-none"
        draggable={false}
      />

      {frames && (
        <span
          className={`absolute bottom-2 right-2 px-2 py-1 bg-black/80 border border-zinc-700 text-[9px] uppercase tracking-widest transition-opacity pointer-events-none ${
            isSpinning ? "opacity-0" : "opacity-100 text-zinc-400"
          }`}
        >
          360&deg; &middot; hover to spin
        </span>
      )}
    </div>
  );
}
