'use client';

import React, { useState, useRef } from 'react';
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

      img.onerror = (e) => reject(e);
    };

    reader.onerror = (e) => reject(e);
  });
};

export default function SkomiDoraLens() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSuccess(false);

    try {
      console.log('Compressing image...');
      const compressedBase64 = await compressImage(file);

      const uploadResponse = await fetch('/api/storage-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressedBase64,
          fileName: `lens_${Date.now()}.jpg`,
        }),
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.text();
        console.error('Storage upload failed:', uploadError);
        throw new Error(`Storage upload failed: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();

      const downloadUrl = uploadResult.imageUrl;
      const imagePath = uploadResult.imagePath;

      console.log('Backend upload succeeded:', {
        bucket: uploadResult.bucket,
        imagePath,
        downloadUrl,
      });

      const response = await fetch('/api/vision-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressedBase64,
          imageUrl: downloadUrl,
          imagePath,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Vision API failed:', response.status, errorText);
        throw new Error(`Vision API failed: ${response.status}`);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('SkoMiDora Lens Error:', error);
      alert(error?.message || 'Failed to analyze image. Please try again.');
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
        capture="environment"
        ref={fileInputRef}
        className="hidden"
        onChange={handleImageCapture}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="w-full sm:w-auto flex items-center justify-center gap-3 bg-[#9A1B22] text-white hover:bg-[#7A151B] px-8 py-6 rounded-none uppercase tracking-[0.2em] text-xs font-bold transition-all disabled:opacity-50 shadow-lg group-hover:shadow-[0_0_20px_rgba(154,27,34,0.3)] border border-[#9A1B22]"
      >
        {isProcessing ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Analyzing Image...
          </>
        ) : success ? (
          <>
            <CheckCircle2 size={16} className="text-white" /> Added to Closet
          </>
        ) : (
          <>
            <Camera size={16} /> Use SkoMiDora Lens
          </>
        )}
      </button>
    </div>
  );
}
