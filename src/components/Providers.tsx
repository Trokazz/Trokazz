import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionContextProvider } from "@/contexts/SessionContext"; // Corrigido: SessionProvider para SessionContextProvider
import { Suspense } from "react";
import PageSkeleton from "./PageSkeleton";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <SessionContextProvider>
            <Sonner />
            <Toaster />
            <Suspense fallback={<PageSkeleton />}>
              {children}
            </Suspense>
          </SessionContextProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}