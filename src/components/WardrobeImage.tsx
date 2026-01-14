'use client';

import Image from 'next/image';

type Props = {
  src?: string;
  alt: string;
  imageStatus?: string;
  className?: string;
};

export default function WardrobeImage({
  src,
  alt,
  imageStatus,
  className,
}: Props) {
  // 🔒 HARD GUARD — do not render missing images
  if (imageStatus !== 'ok' || !src) {
    return (
      <div className="flex items-center justify-center bg-zinc-900 text-zinc-500 text-xs italic rounded-xl w-full h-full">
        Image unavailable
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className || 'object-contain'}
      sizes="(max-width: 768px) 100vw, 33vw"
      priority={false}
    />
  );
}
