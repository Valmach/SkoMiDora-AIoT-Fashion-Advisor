'use client';

import { useState } from 'react';
import { parseBrandEmails } from '@/app/actions/parse-brand-emails';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Mail } from "lucide-react";

export default function AggregatorTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleLiveIngestion = async () => {
    setLoading(true);
    setResult(null);
    try {
      console.log("Starting live Gmail extraction...");
      const res = await parseBrandEmails();
      console.log("Live Pipeline Result:", res);
      setResult(res);
    } catch (error) {
      console.error(error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-muted-foreground/30 bg-muted/10">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Live Gmail Ingestion Pipeline
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connects to the Gmail API, searches for Amazon receipts, and uses Gemini 2.5 Flash to extract items directly into Firestore.
            </p>
          </div>
          
          <Button 
            onClick={handleLiveIngestion} 
            disabled={loading}
            className="whitespace-nowrap"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ingesting Data...</>
            ) : (
              'Run Live Pipeline'
            )}
          </Button>
        </div>

        {result && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Pipeline Output:</h4>
            <pre className="bg-slate-950 text-emerald-400 p-4 rounded-md overflow-x-auto text-xs max-h-60 border border-slate-800">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}