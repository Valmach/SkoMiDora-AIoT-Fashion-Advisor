"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import CalendarConnectButton from "@/components/ui/CalendarConnectButton";
import { Bonheur_Royale } from 'next/font/google';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Archive, 
  Sparkles, 
  Mail, 
  Settings, 
  ChevronUp, 
  PanelLeftClose,
  Menu,
  X
} from "lucide-react";

const bonheur = Bonheur_Royale({ 
  subsets: ['latin'], 
  weight: ['400'],
});

const MENU_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/" },
  { name: "Closet", icon: Archive, href: "/closet" },
  { name: "Events", icon: CalendarDays, href: "/upcoming-events" },
  { name: "Outfits", icon: Sparkles, href: "/outfit-recommendations" }, 
  { name: "AI Stylist", icon: Sparkles, href: "/stylist" },
  { name: "Inbox", icon: Mail, href: "/inbox" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Router fallback close
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileOpen(false); // Instant close on scroll
  };

  return (
    <>
      {/* MOBILE FLOATING HAMBURGER BUTTON */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-6 right-6 z-40 p-3 bg-[#050505] border border-zinc-800 rounded-full shadow-2xl text-zinc-400 hover:text-white transition-all"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* MOBILE BACKDROP */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-500"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR ARCHITECTURE */}
      <aside 
        className={`h-screen bg-[#050505] border-r border-zinc-900/80 flex flex-col transition-all duration-500 ease-in-out shrink-0 z-50
          fixed md:relative top-0 left-0
          ${isMobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full w-[260px]"}
          md:translate-x-0 ${isCollapsed ? "md:w-[80px]" : "md:w-[240px]"}
        `}
      >
        {/* BRAND HEADER */}
        <div className="h-[100px] flex items-center justify-between px-6 border-b border-zinc-900/50 shrink-0">
          <Link href="/" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-3 group">
            <div className="h-8 w-8 rounded-full border border-zinc-700 flex items-center justify-center group-hover:border-[#9A1B22] transition-colors duration-500">
              <span className={`${bonheur.className} text-xl text-zinc-300 group-hover:text-white`}>S</span>
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <span className="text-zinc-200 font-bold tracking-widest text-sm uppercase">
                SkoMiDora
              </span>
            )}
          </Link>
          
          {/* Mobile Close Icon */}
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-zinc-600 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* NAVIGATION ARCHITECTURE */}
        <nav className="flex-1 overflow-y-auto py-8 scrollbar-hide flex flex-col gap-2 px-3">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsMobileOpen(false)} // INSTANT CLOSE FIX
                className={`group relative flex items-center h-12 rounded-sm transition-all duration-300 overflow-hidden
                  ${isActive ? "bg-zinc-900/40" : "hover:bg-zinc-900/20"}
                  ${isCollapsed && !isMobileOpen ? "justify-center" : "px-5"}
                `}
              >
                {/* Magnetic Line Reveal */}
                <div 
                  className={`absolute left-0 top-0 h-full w-[3px] bg-[#9A1B22] transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]
                    ${isActive ? "translate-y-0" : "-translate-y-full group-hover:translate-y-0"}
                  `} 
                />

                <item.icon 
                  className={`h-4 w-4 shrink-0 transition-all duration-500 ease-out
                    ${isActive ? "text-[#9A1B22]" : "text-zinc-600 group-hover:text-[#9A1B22]"}
                    ${(!isCollapsed || isMobileOpen) && "group-hover:translate-x-1"}
                  `} 
                />
                
                {(!isCollapsed || isMobileOpen) && (
                  <span 
                    className={`ml-4 text-[10px] uppercase tracking-[0.2em] font-semibold transition-colors duration-300
                      ${isActive ? "text-zinc-100" : "text-zinc-500 group-hover:text-zinc-200"}
                    `}
                  >
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* UTILITY FOOTER */}
        <div className="p-4 border-t border-zinc-900/50 flex flex-col gap-2 shrink-0">
          
          {/* Google Calendar Connection */}
          <CalendarConnectButton
            compact={isCollapsed && !isMobileOpen}
          />

          {/* Settings */}
          <Link 
            href="/settings"
            onClick={() => setIsMobileOpen(false)} // INSTANT CLOSE FIX
            className={`group flex items-center h-12 rounded-sm transition-all duration-300 hover:bg-zinc-900/20
              ${isCollapsed && !isMobileOpen ? "justify-center" : "px-5"}
            `}
          >
            <Settings className="h-4 w-4 shrink-0 text-zinc-600 group-hover:text-zinc-300 transition-all duration-500 group-hover:rotate-90" />
            {(!isCollapsed || isMobileOpen) && (
              <span className="ml-4 text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 group-hover:text-zinc-300 transition-colors">
                Settings
              </span>
            )}
          </Link>

          {/* Scroll To Top Elevator */}
          <button 
            onClick={scrollToTop}
            className={`group flex items-center h-12 rounded-sm transition-all duration-300 hover:bg-[#9A1B22]/10
              ${isCollapsed && !isMobileOpen ? "justify-center" : "px-5"}
            `}
            title="Return to Top"
          >
            <ChevronUp className="h-4 w-4 shrink-0 text-zinc-600 group-hover:text-[#9A1B22] transition-all duration-500 group-hover:-translate-y-1" />
            {(!isCollapsed || isMobileOpen) && (
              <span className="ml-4 text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 group-hover:text-[#9A1B22] transition-colors">
                Scroll Top
              </span>
            )}
          </button>

          {/* Desktop Collapse Toggle (Hidden on Mobile) */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden md:flex group items-center h-12 rounded-sm transition-all duration-300 hover:bg-zinc-900/20 mt-2 border-t border-zinc-900/50
              ${isCollapsed ? "justify-center" : "px-5"}
            `}
          >
            <PanelLeftClose className={`h-4 w-4 shrink-0 text-zinc-700 group-hover:text-zinc-400 transition-transform duration-500 ${isCollapsed && "rotate-180"}`} />
            {!isCollapsed && (
              <span className="ml-4 text-[9px] uppercase tracking-[0.25em] font-bold text-zinc-700 group-hover:text-zinc-400 transition-colors">
                Collapse
              </span>
            )}
          </button>

        </div>
      </aside>
    </>
  );
}