"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useMe } from "@/hooks/useMe";
import { AppSidebar } from "@/components/layout/Sidebar";
import { SoundLayer } from "@/components/shared/SoundLayer";
import { KeyboardShortcuts } from "@/components/shared/KeyboardShortcuts";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useMe();

  // Wait for client-side hydration before checking auth
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !accessToken) {
      router.replace("/login");
    }
  }, [mounted, accessToken, router]);

  // Don't render until hydrated — avoids flash redirect on first load
  if (!mounted) return null;
  if (!accessToken) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SoundLayer />
      <KeyboardShortcuts />
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
        {children}
      </div>
    </div>
  );
}
