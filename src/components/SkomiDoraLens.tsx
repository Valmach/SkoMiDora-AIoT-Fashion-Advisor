'use client';

import React, { useState, useRef } from 'react';
import { Camera, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase'; 

// Client-side image compression helper to bypass the 494 Error
const compressImage = (file: File, maxWidth = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Calculate new dimensions keeping aspect ratio
        const ratio = maxWidth / img.width;
        const width = img.width > maxWidth ? maxWidth : img.width;
        const height = img.width > maxWidth ? img.height * ratio : img.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Failed to get canvas context"));
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Export as heavily compressed JPEG (0.7 quality)
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

  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setSuccess(false);

    try {
      // 1. COMPRESS THE IMAGE FIRST to dodge the 494 Payload Limit
      console.log("Original file size:", (file.size / 1024 / 1024).toFixed(2), "MB");
      const compressedBase64 = await compressImage(file);
      console.log("Compressed base64 created successfully");

      // 2. Upload the tiny compressed image to Firebase Storage
      const storage = getStorage(app);
      const storageRef = ref(storage, `public_wardrobe_items/lens_${Date.now()}.jpg`);
      await uploadString(storageRef, compressedBase64, 'data_url');
      const downloadUrl = await getDownloadURL(storageRef);

      // 3. Pass the tiny string to our Vision API
      const response = await fetch('/api/vision-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: compressedBase64, 
          imageUrl: downloadUrl 
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("API Error Response:", errData);
        throw new Error(`Vision API failed: ${response.status}`);
      }
      
      setIsProcessing(false);
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 3000);

    } catch (error) {
      console.error("SkoMiDora Lens Error:", error);
      setIsProcessing(false);
      alert("Failed to analyze image. Please try again.");
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
          <><Loader2 size={16} className="animate-spin" /> Analyzing Image...</>
        ) : success ? (
          <><CheckCircle2 size={16} className="text-white" /> Added to Closet</>
        ) : (
          <><Camera size={16} /> Use SkoMiDora Lens</>
        )}
      </button>
    </div>
  );
}