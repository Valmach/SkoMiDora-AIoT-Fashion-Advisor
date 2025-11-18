"use client";

import { Sparkles, PanelLeft } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

// SkoMiDora Logo with currentColor for theming
const SkoMiDoraLogo = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor" // Uses text color from parent (primary-foreground or accent-foreground)
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9V15C9 16.6569 10.3431 18 12 18C13.6569 18 15 16.6569 15 15" />
    <line x1="9" y1="12" x2="15" y2="12" />
  </svg>
);

export default function Header() {
  const { toggleSidebar, isMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          {isMobile && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="mr-2"
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          )}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-primary text-primary-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
              <SkoMiDoraLogo />
            </div>
            <h1 className="text-lg font-calligraphy tracking-tight text-foreground group-hover:text-accent transition-colors sm:text-xl">
              SkoMiDora AIoT Fashion Advisor
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-x-2">
          <Sparkles className="h-5 w-5 text-accent hidden sm:inline" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
