'use client';

import React, { useState } from 'react';

interface WardrobeMediaProps {
  src: string;
  alt: string;
}

const WardrobeMedia: React.FC<WardrobeMediaProps> = ({ src, alt }) => {
  const [isBroken, setIsBroken] = useState(false);
  const isVideo = /\.(mp4|webm|ogg)(?:\?.*)?$/i.test(src);

  const handleError = () => {
    setIsBroken(true);
  };

  if (isBroken) {
    return (
      <div className="flex items-center justify-center bg-zinc-900 text-zinc-500 text-xs italic rounded-xl w-full h-full">
        Image unavailable
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
        onError={handleError}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={handleError}
    />
  );
};

export default WardrobeMedia;
