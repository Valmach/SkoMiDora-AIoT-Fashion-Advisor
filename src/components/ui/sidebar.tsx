"use client";

import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorage } from "@/hooks/use-local-storage";

const sidebarVariants = cva(
  "z-50 flex flex-col transition-all duration-300 ease-in-out",
  {
    variants: {
      state: {
        expanded: "w-64",
        collapsed: "w-16",
      },
    },
    defaultVariants: {
      state: "expanded",
    },
  },
);

interface SidebarContextProps {
  state: "expanded" | "collapsed";
  isMobile: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(
  undefined,
);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [state, setState] = useLocalStorage<"expanded" | "collapsed">(
    "sidebarState",
    "expanded",
  );

  React.useEffect(() => {
    if (isMobile) {
      setState("collapsed");
    }
  }, [isMobile, setState]);

  const toggleSidebar = () => {
    setState((prevState) =>
      prevState === "expanded" ? "collapsed" : "expanded",
    );
  };

  const closeSidebar = () => {
    if (isMobile) {
      setState("collapsed");
    }
  };

  const openSidebar = () => {
    if (isMobile) {
      setState("expanded");
    }
  };

  return (
    <SidebarContext.Provider
      value={{ state, isMobile, toggleSidebar, closeSidebar, openSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

export function Sidebar({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const { state } = useSidebar();

  return (
    <aside
      className={cn(
        "bg-background border-r",
        sidebarVariants({ state }),
        className,
      )}
      {...props}
    />
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-16 border-b", className)} {...props} />;
}

export function SidebarContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1 overflow-y-auto", className)} {...props} />;
}

export function SidebarFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-auto", className)} {...props} />;
}

export function SidebarMenu({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

export function SidebarMenuItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />;
}

export interface SidebarMenuButtonProps extends ButtonProps {
  isActive?: boolean;
}

export function SidebarMenuButton({
  className,
  isActive,
  ...props
}: SidebarMenuButtonProps) {
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={cn(
        "h-10 w-full justify-start",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        !isActive &&
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}
