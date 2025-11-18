import { Main } from "@/components/ui/main";
import Header from "@/components/layout/Header";

export default function AppMain({ children }: { children: React.ReactNode }) {
  return (
    <Main className="flex flex-col">
      <Header />
      <main className="flex-grow overflow-auto p-2 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="w-full text-center p-4 mt-auto text-xs text-muted-foreground">
        <div className="flex items-center justify-center space-x-2">
          <span>
            App Designed, Created & Developed by Valentino Massimo,
            @SkoMiDora@SHOURAiGen 2025 All Rights Reserved
          </span>
        </div>
      </footer>
    </Main>
  );
}
