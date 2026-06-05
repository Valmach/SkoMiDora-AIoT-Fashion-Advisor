"use client";

import { Mail } from "lucide-react";
import AggregatorTest from '@/components/AggregatorTest';

export default function InboxPage() {
  return (
    <div className="container mx-auto space-y-8 pb-12 h-[85vh] overflow-y-auto scrollbar-hide text-white max-w-4xl pt-8">
      
      <div className="bg-black p-8 rounded-3xl border border-zinc-800 shadow-lg mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-white mb-3">
          <Mail className="h-8 w-8 text-[#DC143C]" />
          Inbox Integration
        </h1>
        <p className="text-zinc-400 text-sm">
          Securely sync your digital receipts, shipping confirmations, and style inspirations directly from Gmail.
        </p>
      </div>

      <div className="bg-black p-6 rounded-3xl border border-zinc-800 shadow-lg">
        <AggregatorTest />
      </div>

    </div>
  );
}