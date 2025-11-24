#!/bin/bash
set -e

FILE="src/app/layout.tsx"

echo "🔧 Backing up existing layout to ${FILE}.bak..."
if [ -f "$FILE" ]; then
  cp "$FILE" "${FILE}.bak"
fi

echo "🔧 Replacing layout.tsx with minimal safe layout..."

cat << 'LAYOUT' > "$FILE"
import type { Metadata } from "next";
import "./globals.css";
import React from "react";

export const metadata: Metadata = {
  title: "SkoMiDora – AIoT Fashion Advisor",
  description: "AI-powered wardrobe, shoebox, and event style advisor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
LAYOUT

echo "✅ Minimal RootLayout written to $FILE"
echo "   Original version saved at ${FILE}.bak"
