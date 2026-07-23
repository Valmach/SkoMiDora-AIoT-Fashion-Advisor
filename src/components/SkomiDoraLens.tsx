'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, CheckCircle2 } from 'lucide-react';

const compressImage = (file: File, maxWidth = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const ratio = maxWidth / img.width;
        const width = img.width > maxWidth ? maxWidth : img.width;
        const height = img.width > maxWidth ? img.height * ratio : img.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };

      img.onerror = reject;
    };

    reader.onerror = reject;
  });
};

export default function SkomiDoraLens() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mobile =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      window.matchMedia('(pointer: coarse)').matches;

    setIsMobile(mobile);
  }, []);

  const openPicker = () => {
    if (!fileInputRef.current || isProcessing) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleImageCapture = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSuccess(false);

    try {
      const compressedBase64 = await compressImage(file);

      const uploadResponse = await fetch('/api/storage-upload?source=skomidora-lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressedBase64,
          fileName: file.name || `lens_${Date.now()}.jpg`,
        }),
      });

      const uploadText = await uploadResponse.text();

      if (!uploadResponse.ok) {
        console.error('SkoMiDora backend upload failed:', uploadResponse.status, uploadText);
        throw new Error(`Storage upload failed: ${uploadResponse.status}`);
      }

      const uploadResult = JSON.parse(uploadText);
      console.log('SkoMiDora Lens backend upload succeeded:', uploadResult);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('SkoMiDora Lens Error:', error);
      alert(error?.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsProcessing(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full sm:w-auto relative group">
      <input
        type="file"
        accept="image/*"
        capture={isMobile ? 'environment' : undefined}
        ref={fileInputRef}
        className="hidden"
        onChange={handleImageCapture}
      />

      <button
        type="button"
        onClick={openPicker}
        disabled={isProcessing}
        className="inline-flex h-11 w-fit max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-none border border-[#9A1B22] bg-black px-5 py-0 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-none transition-all duration-300 hover:border-[#D42A36] hover:bg-[#9A1B22] hover:shadow-[0_0_20px_rgba(197,37,49,0.5)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C52531] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Uploading Image...
          </>
        ) : success ? (
          <>
            <CheckCircle2 size={16} className="text-white" /> Added to Closet
          </>
        ) : (
          <>
            <Camera size={14} /> Use SkoMiDora Lens Backend
          </>
        )}
      </button>
    </div>
  );
}
