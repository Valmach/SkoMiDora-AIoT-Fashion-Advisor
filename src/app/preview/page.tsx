'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Computer, Smartphone } from "lucide-react";

export default function PreviewPage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="desktop">
            <div className="flex justify-center mb-4">
              <TabsList>
                <TabsTrigger value="desktop">
                  <Computer className="mr-2 h-5 w-5" />
                  Desktop
                </TabsTrigger>
                <TabsTrigger value="mobile">
                  <Smartphone className="mr-2 h-5 w-5" />
                  Mobile
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="desktop">
              <div className="bg-card border-2 rounded-lg overflow-hidden h-[70vh]">
                <iframe
                  src="/"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  loading="lazy"
                />
              </div>
            </TabsContent>
            <TabsContent value="mobile">
              <div className="bg-card border-2 rounded-lg overflow-hidden mx-auto h-[70vh] max-w-sm">
                <iframe
                  src="/"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  loading="lazy"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}