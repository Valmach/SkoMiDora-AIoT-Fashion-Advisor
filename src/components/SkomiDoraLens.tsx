'use client';

import React, { useState, useRef } from 'react';
import { Camera, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { app } from '@/lib/firebase'; 

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
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onloadend = async () => {
        const base64Data = reader.result as string;

        // 1. Upload to Firebase Storage for permanent URL
        const storage = getStorage(app);
        const storageRef = ref(storage, `public_wardrobe_items/lens_${Date.now()}.jpg`);
        await uploadString(storageRef, base64Data, 'data_url');
        const downloadUrl = await getDownloadURL(storageRef);

        // 2. Pass to our new Vision API
        const response = await fetch('/api/vision-ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            imageBase64: base64Data, 
            imageUrl: downloadUrl 
          })
        });

        if (!response.ok) throw new Error("Vision API failed");
        
        setIsProcessing(false);
        setSuccess(true);
        
        setTimeout(() => setSuccess(false), 3000);
      };

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