'use client';

import { useState } from 'react';
import { uploadAndEnrichWardrobeItem } from '@/app/actions/upload_wardrobe_item';

export default function WardrobeUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setStatusMessage(`📤 Preparing ${file.name} for AI Vision extraction...`);

      // Convert browser File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      setStatusMessage('👁️ Uploading to storage and running Gemini Vision analysis...');
      
      // Call your server action securely
      const result = await uploadAndEnrichWardrobeItem('user_default', buffer, file.name);

      if (result.success) {
        setStatusMessage(`✅ Success! Enriched: "${result.metadata.aiFriendlyName}"`);
        alert(`Successfully cataloged item: ${result.metadata.aiFriendlyName}`);
      } else {
        setStatusMessage('❌ Upload failed.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setStatusMessage('❌ An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-950 text-white shadow-xl max-w-md">
      <h3 className="text-lg font-semibold mb-2">Upload Closet Item</h3>
      <p className="text-sm text-zinc-400 mb-4">
        Items uploaded here are instantly analyzed by Gemini Vision to populate categories, colors, and materials automatically.
      </p>

      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange}
        disabled={isUploading}
        className="block w-full text-sm text-zinc-400
          file:mr-4 file:py-2.5 file:px-4
          file:rounded-lg file:border-0
          file:text-sm file:font-semibold
          file:bg-red-950 file:text-red-200
          hover:file:bg-red-900 cursor-pointer disabled:opacity-50"
      />

      {isUploading && (
        <div className="mt-4 flex items-center gap-3 text-sm text-amber-400 animate-pulse">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          {statusMessage}
        </div>
      )}

      {!isUploading && statusMessage && (
        <p className="mt-4 text-sm text-zinc-300">{statusMessage}</p>
      )}
    </div>
  );
}