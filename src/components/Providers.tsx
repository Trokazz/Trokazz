import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner"; // Renomeado para evitar conflito
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionContextProvider } from "@/contexts/SessionContext";
import { Suspense } from "react";
import PageSkeleton from "./PageSkeleton";

// Configura o QueryClient com um staleTime padrão de 5 minutos
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <SessionContextProvider>
            <Sonner /> {/* Mantém apenas o Sonner para toasts */}
            <Suspense fallback={<PageSkeleton />}>
              {children}
            </Suspense>
          </SessionContextProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}