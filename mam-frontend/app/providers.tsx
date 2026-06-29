"use client";

import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { playSound } from "@/lib/sounds";
import { useLanguageStore } from "@/store/language";

function ToasterWithDir() {
  const { locale } = useLanguageStore();
  const pos = locale === "ar" ? "bottom-left" : "bottom-right";
  return <Toaster richColors position={pos} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onSuccess: () => playSound("success"),
          onError: () => playSound("error"),
        }),
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,   // 5 minutes — data is fresh for 5 min, no refetch
            gcTime: 10 * 60 * 1000,     // keep cache 10 min
            refetchOnWindowFocus: false, // never refetch just because user clicked the window
            refetchOnReconnect: false,   // don't hammer backend on reconnect
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange={false}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ToasterWithDir />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
