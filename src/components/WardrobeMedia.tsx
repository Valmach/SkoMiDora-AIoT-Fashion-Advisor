'use client';

import React from 'react';

interface WardrobeMediaProps {
  src: string;
  alt: string;
}

const WardrobeMedia: React.FC<WardrobeMediaProps> = ({ src, alt }) => {
  const isVideo = /\.(mp4|webm|ogg)(?:\?.*)?$/i.test(src);
  
  if (isVideo) {
    return (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
};

export default WardrobeMedia;