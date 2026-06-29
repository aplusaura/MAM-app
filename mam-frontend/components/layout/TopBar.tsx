"use client";

import { useAuthStore } from "@/store/auth";
import { useSidebarStore } from "@/store/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationDropdown } from "@/components/shared/NotificationDropdown";
import { ChatPopover } from "@/components/shared/ChatPopover";
import { useEffect, useState, useRef, useCallback } from "react";
import { Sun, Moon, Menu, Play, Pause, Square, Search, FolderOpen, CheckSquare, User, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

interface TopBarProps {
  title: string;
}

interface SearchResult {
  id: string | number;
  type: "project" | "task" | "client" | "lead";
  title: string;
  subtitle?: string;
}

// Day state: idle | running | paused
type DayState = "idle" | "running" | "paused";

function loadDayState(): { state: DayState; runningSince: number | null; accumulatedMs: number } {
  try {
    const s = localStorage.getItem("day_state") as DayState | null;
    const rs = localStorage.getItem("day_running_since");
    const acc = localStorage.getItem("day_accumulated_ms");
    return {
      state: s ?? "idle",
      runningSince: rs ? new Date(rs).getTime() : null,
      accumulatedMs: acc ? parseInt(acc) : 0,
    };
  } catch { return { state: "idle", runningSince: null, accumulatedMs: 0 }; }
}

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function TopBar({ title }: TopBarProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { openMobile } = useSidebarStore();
  const { theme, setTheme } = useTheme();
  const [now, setNow] = useState(new Date());
  const qc = useQueryClient();
  const isEmployee = !!user?.employee_id;
  const router = useRouter();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await get<SearchResult[]>("/ai/search", { q: value });
        setSearchResults(Array.isArray(data) ? data : []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  function getSearchIcon(type: SearchResult["type"]) {
    switch (type) {
      case "project": return <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />;
      case "task":    return <CheckSquare className="h-4 w-4 shrink-0 text-emerald-500" />;
      case "client":  return <User className="h-4 w-4 shrink-0 text-purple-500" />;
      case "lead":    return <Users className="h-4 w-4 shrink-0 text-amber-500" />;
    }
  }

  function getSearchPath(type: SearchResult["type"]) {
    switch (type) {
      case "project": return "/projects";
      case "task":    return "/tasks";
      case "client":  return "/clients";
      case "lead":    return "/leads";
    }
  }

  function handleResultClick(result: SearchResult) {
    router.push(getSearchPath(result.type));
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  }

  // Day tracking state — all users use localStorage for instant UI response
  const [dayState, setDayState] = useState<DayState>("idle");
  const [runningSince, setRunningSince] = useState<number | null>(null);
  const [accumulatedMs, setAccumulatedMs] = useState(0);

  // Load state from localStorage on mount
  useEffect(() => {
    const { state, runningSince: rs, accumulatedMs: acc } = loadDayState();
    setDayState(state);
    setRunningSince(rs);
    setAccumulatedMs(acc);
  }, []);

  // Employee API mutations (fire in background, UI is already updated via state)
  const clockInMutation = useMutation({
    mutationFn: () => post("/employees/me/clock-in", {}),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const clockOutMutation = useMutation({
    mutationFn: () => post("/employees/me/clock-out", {}),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleStart = () => {
    const now = Date.now();
    localStorage.setItem("day_state", "running");
    localStorage.setItem("day_running_since", new Date(now).toISOString());
    localStorage.setItem("day_accumulated_ms", "0");
    setDayState("running");
    setRunningSince(now);
    setAccumulatedMs(0);
    if (isEmployee) clockInMutation.mutate();
    toast.success("Work session started");
  };

  const handlePause = () => {
    const earned = runningSince ? Date.now() - runningSince : 0;
    const total = accumulatedMs + earned;
    localStorage.setItem("day_state", "paused");
    localStorage.removeItem("day_running_since");
    localStorage.setItem("day_accumulated_ms", String(total));
    setDayState("paused");
    setRunningSince(null);
    setAccumulatedMs(total);
    if (isEmployee) clockOutMutation.mutate();
    toast.success("Session paused");
  };

  const handleResume = () => {
    const now = Date.now();
    localStorage.setItem("day_state", "running");
    localStorage.setItem("day_running_since", new Date(now).toISOString());
    setDayState("running");
    setRunningSince(now);
    if (isEmployee) clockInMutation.mutate();
    toast.success("Session resumed");
  };

  const handleEnd = () => {
    const earned = runningSince ? Date.now() - runningSince : 0;
    const totalMs = accumulatedMs + earned;
    const h = Math.floor(totalMs / 3_600_000);
    const m = Math.floor((totalMs % 3_600_000) / 60_000);
    // Save to history
    const history = JSON.parse(localStorage.getItem("day_history") || "[]");
    history.unshift({ date: new Date().toISOString().slice(0, 10), duration: `${h}h ${m}m`, ms: totalMs });
    localStorage.setItem("day_history", JSON.stringify(history.slice(0, 30)));
    // Clear current session
    localStorage.removeItem("day_state");
    localStorage.removeItem("day_running_since");
    localStorage.removeItem("day_accumulated_ms");
    setDayState("idle");
    setRunningSince(null);
    setAccumulatedMs(0);
    if (isEmployee) clockOutMutation.mutate();
    toast.success(`Day ended — ${h}h ${m}m logged`);
  };

  // Live elapsed display
  const [elapsed, setElapsed] = useState("0:00:00");
  useEffect(() => {
    if (dayState === "idle") { setElapsed("0:00:00"); return; }
    if (dayState === "paused") { setElapsed(fmtMs(accumulatedMs)); return; }
    const update = () => {
      const live = runningSince ? Date.now() - runningSince : 0;
      setElapsed(fmtMs(accumulatedMs + live));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [dayState, runningSince, accumulatedMs]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200/40 dark:border-gray-700/40 bg-gray-50/70 dark:bg-gray-900/70 backdrop-blur-xl backdrop-saturate-150 shadow-sm px-3 sm:px-6 gap-3">
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={openMobile}
          className="md:hidden p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[140px] sm:max-w-none">{title}</h1>
        <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-700/50 px-2 py-0.5 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 tracking-wide">
          v1.8.11
        </span>
      </div>

      {/* Global search — center */}
      <div ref={searchRef} className="relative hidden sm:flex flex-1 max-w-sm mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:focus:ring-blue-500/30 transition-colors"
          />
          {searchLoading && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          )}
        </div>
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
            {searchResults.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">{t("noResults")}</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
                {searchResults.map((result) => (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {getSearchIcon(result.type)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{result.subtitle}</p>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-300 dark:text-gray-600 shrink-0">
                        {result.type}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5">
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-none">{dayName}, {dateStr}</p>
            <p className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 leading-tight mt-0.5">{timeStr}</p>
          </div>
        </div>
        {/* Start My Day — all users */}
        <div className="hidden sm:flex items-center gap-1.5">
          {dayState === "idle" && (
            <button
              onClick={handleStart}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Play className="h-3 w-3 shrink-0" />
              <span className="hidden md:inline">{t("startYourDay")}</span>
            </button>
          )}
          {(dayState === "running" || dayState === "paused") && (
            <>
              {/* Timer display */}
              <span className={`font-mono text-xs font-semibold px-2 py-1 rounded-lg ${dayState === "running" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"}`}>
                {dayState === "running" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse mr-1.5 align-middle" />}
                {dayState === "paused" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500 mr-1.5 align-middle" />}
                {elapsed}
              </span>
              {/* Pause / Resume */}
              {dayState === "running" ? (
                <button onClick={handlePause} title="Pause"
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors">
                  <Pause className="h-3 w-3" />
                  <span className="hidden md:inline">{t("pauseDay")}</span>
                </button>
              ) : (
                <button onClick={handleResume} title="Resume"
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors">
                  <Play className="h-3 w-3" />
                  <span className="hidden md:inline">Resume</span>
                </button>
              )}
              {/* End My Day */}
              <button onClick={handleEnd} title="End My Day"
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                <Square className="h-3 w-3" />
                <span className="hidden md:inline">{t("endDay")}</span>
              </button>
            </>
          )}
        </div>
        {/* Chat Popover */}
        <ChatPopover />
        <NotificationDropdown />
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-none">{user?.full_name ?? user?.email ?? "User"}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{user?.is_superuser ? "Administrator" : "Staff"}</p>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
