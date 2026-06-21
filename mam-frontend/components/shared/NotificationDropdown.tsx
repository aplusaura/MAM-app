"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch } from "@/lib/api";
import { toast } from "sonner";
import { Bell, CheckCircle2, AlertCircle, Activity, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Notification, Task, ActivityLog, Conversation } from "@/types";
import { formatDistanceToNow, differenceInDays, parseISO, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import { playSound } from "@/lib/sounds";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {children}
      </span>
    </div>
  );
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const router = useRouter();

  // --- Existing notifications ---
  const { data: notificationsData } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => get("/notifications/"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // --- Tasks (for overdue) — only fetch when dropdown is open ---
  const { data: tasksData } = useQuery<Task[]>({
    queryKey: ["tasks-for-notifications"],
    queryFn: () => get("/tasks/"),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  // --- Activity logs — only fetch when open ---
  const { data: activityData } = useQuery<ActivityLog[]>({
    queryKey: ["activity-logs-dropdown"],
    queryFn: () => get("/notifications/activity-logs?limit=10"),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  // --- Conversations (for unread count) — only fetch when open ---
  const { data: conversationsData } = useQuery<Conversation[]>({
    queryKey: ["conversations-dropdown"],
    queryFn: () => get("/messages/conversations"),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  // --- Mutations ---
  const markAllReadMutation = useMutation({
    mutationFn: () => patch("/notifications/mark-all-read", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => toast.error("Failed to mark notifications as read"),
  });

  // --- Derived data ---
  const notifications = notificationsData ?? [];
  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const today = startOfDay(new Date());
  const overdueTasks = useMemo(() => {
    if (!tasksData) return [];
    return tasksData
      .filter((t) => {
        if (!t.due_date) return false;
        if (t.status === "done" || t.status === "cancelled") return false;
        return startOfDay(parseISO(t.due_date)) < today;
      })
      .slice(0, 5);
  }, [tasksData, today]);

  const recentActivity = useMemo(() => {
    if (!activityData) return [];
    return activityData.slice(0, 5);
  }, [activityData]);

  const unreadMessageCount = useMemo(() => {
    if (!conversationsData) return 0;
    return conversationsData.filter((c) => c.unread > 0).length;
  }, [conversationsData]);

  // Badge = all alerts (unread notifications + unread messages + overdue tasks)
  const totalBadgeCount = useMemo(() => {
    return unreadNotifCount + unreadMessageCount + overdueTasks.length;
  }, [unreadNotifCount, unreadMessageCount, overdueTasks.length]);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.is_read).slice(0, 10),
    [notifications]
  );

  const hasAnything =
    unreadNotifications.length > 0 || overdueTasks.length > 0 || recentActivity.length > 0 || unreadMessageCount > 0;

  const getNotifRoute = (notif: Notification): string => {
    if (notif.entity_type === "task" && notif.entity_id) return `/tasks/${notif.entity_id}`;
    if (notif.entity_type === "project" && notif.entity_id) return `/projects/${notif.entity_id}`;
    if (notif.entity_type === "invoice" && notif.entity_id) return `/finance`;
    if (notif.entity_type === "leave_request") return `/employees`;
    if (notif.entity_type === "message") return `/messages`;
    return "/alerts";
  };

  // Auto-mark notifications as read when dropdown is opened
  useEffect(() => {
    if (open && unreadNotifCount > 0) {
      markAllReadMutation.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Play sound when new unread notifications arrive
  const prevUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevUnreadRef.current !== null && unreadNotifCount > prevUnreadRef.current) {
      playSound("notification");
    }
    prevUnreadRef.current = unreadNotifCount;
  }, [unreadNotifCount]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        {totalBadgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {totalBadgeCount > 9 ? "9+" : totalBadgeCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[calc(100vw-2rem)] max-w-xs sm:w-96 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Notifications
            </span>
            <div className="flex items-center gap-3">
              {unreadNotifCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => { setOpen(false); router.push("/alerts"); }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:underline"
              >
                View all
              </button>
            </div>
          </div>

          <div className="max-h-[480px] overflow-y-auto">
            {/* Unread messages banner */}
            {unreadMessageCount > 0 && (
              <div
                onClick={() => { setOpen(false); router.push("/messages"); }}
                className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer border-b border-blue-100 dark:border-blue-800/40 transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  {unreadMessageCount === 1
                    ? "1 unread conversation"
                    : `${unreadMessageCount} unread conversations`}
                </span>
                <span className="ml-auto text-xs text-blue-400">Go →</span>
              </div>
            )}

            {/* Section: Notifications */}
            {unreadNotifications.length > 0 && (
              <>
                <SectionHeader>Notifications</SectionHeader>
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {unreadNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => { setOpen(false); router.push(getNotifRoute(notif)); }}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100 truncate">
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {notif.body}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Section: Overdue Tasks */}
            {overdueTasks.length > 0 && (
              <>
                <SectionHeader>Overdue Tasks</SectionHeader>
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {overdueTasks.map((task) => {
                    const daysOverdue = differenceInDays(
                      today,
                      startOfDay(parseISO(task.due_date!))
                    );
                    return (
                      <div
                        key={task.id}
                        onClick={() => { setOpen(false); router.push("/alerts"); }}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100 truncate">
                            {task.title}
                          </p>
                          <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {daysOverdue === 1 ? "1 day overdue" : `${daysOverdue} days overdue`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Section 2: Recent Activity */}
            {recentActivity.length > 0 && (
              <>
                <SectionHeader>Recent Activity</SectionHeader>
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <Activity className="mt-0.5 h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug truncate">
                          {log.action}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Empty state */}
            {!hasAnything && (
              <div className="flex flex-col items-center gap-2 py-10 px-4">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  All caught up!
                </p>
                <p className="text-xs text-gray-400 text-center">
                  No overdue tasks or new activity right now.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2.5 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
            <button
              onClick={() => { setOpen(false); router.push("/tasks"); }}
              className="text-xs text-blue-600 hover:underline"
            >
              All tasks →
            </button>
            <button
              onClick={() => { setOpen(false); router.push("/settings"); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:underline"
            >
              Activity log →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
