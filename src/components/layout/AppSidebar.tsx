"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Lightbulb,
  Archive,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

// SkoMiDora Logo with currentColor for theming
const SkoMiDoraLogoSmall = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor" // Uses text color from parent
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-sidebar-primary"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9V15C9 16.6569 10.3431 18 12 18C13.6569 18 15 16.6569 15 15" />
    <line x1="9" y1="12" x2="15" y2="12" />
  </svg>
);

export default function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile, toggleSidebar, closeSidebar } = useSidebar();

  const menuItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      color: "text-blue-400",
    },
    {
      href: "/upcoming-events",
      label: "Events",
      icon: CalendarDays,
      color: "text-green-400",
    },
    {
      href: "/closet",
      label: "Closet",
      icon: Archive,
      color: "text-amber-500",
    },
    {
      // ✅ FIXED: Changed from /recommendations to /outfit-recommendations
      href: "/outfit-recommendations", 
      label: "Outfits",
      icon: Lightbulb,
      color: "text-yellow-400",
    },
    {
      href: "/settings",
      label: "Settings",
      icon: SettingsIcon,
      color: "text-gray-400",
    },
  ];

  const handleLinkClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-3">
        <div
          className={cn(
            "flex items-center gap-2",
            state === "collapsed" && "justify-center",
          )}
        >
          <div
            className={cn(
              "p-1.5 rounded-md bg-sidebar-primary/20",
              state === "collapsed" && "bg-transparent",
            )}
          >
            <SkoMiDoraLogoSmall />
          </div>
          {state === "expanded" && (
            <span className="text-lg font-semibold text-sidebar-foreground">
              SkoMiDora
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-grow p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href} className="relative">
              <Link
                href={item.href}
                className="w-full"
                onClick={handleLinkClick}
              >
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  className={cn(
                    "w-full justify-start h-auto py-2",
                    state === "collapsed" ? "flex-col items-center h-14" : "",
                  )}
                  aria-label={item.label}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", item.color)} />
                  <span
                    className={cn(
                      "text-sm font-medium",
                      state === "expanded" ? "ml-2" : "text-[10px] mt-1",
                    )}
                  >
                    {item.label}
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t">
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="w-full justify-start data-[state=expanded]:sm:justify-start data-[state=collapsed]:sm:justify-center"
            onClick={toggleSidebar}
            aria-label={
              state === "expanded" ? "Collapse sidebar" : "Expand sidebar"
            }
            data-state={state}
          >
            {state === "expanded" ? (
              <PanelLeftClose className="h-6 w-6" />
            ) : (
              <PanelLeftOpen className="h-6 w-6" />
            )}
            {state === "expanded" && (
              <span className="ml-2 text-sm">Collapse</span>
            )}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
