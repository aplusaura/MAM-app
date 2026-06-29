"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, getErrorMessage } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarView, CalendarItem } from "@/components/shared/CalendarView";
import { toast } from "sonner";
import { CalendarDays, Plus, MapPin, Calendar, ShieldCheck, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "@/hooks/useTranslation";

interface ShootingBrief {
  id: number;
  task_id: number;
  what_was_shot?: string;
  location?: string;
  shoot_date?: string;
  crew_present?: string;
  what_happened?: string;
  raw_footage_notes?: string;
  created_at: string;
}

interface TaskOption {
  id: number;
  title: string;
  task_code?: string;
  task_type?: string;
  status?: string;
  due_date?: string;
}

interface ShootingForm {
  task_id: string;
  new_task_title: string;
  what_was_shot: string;
  location: string;
  shoot_date: string;
  shoot_time: string;
  crew_present: string;
  what_happened: string;
  raw_footage_notes: string;
}

type Tab = "shooting" | "moderation" | "general";

export default function CalendarPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("shooting");
  const { t } = useTranslation();
  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected] = useState<ShootingBrief | null>(null);
  const [form, setForm] = useState<ShootingForm>({
    task_id: "", new_task_title: "", what_was_shot: "", location: "", shoot_date: format(new Date(), "yyyy-MM-dd"),
    shoot_time: "", crew_present: "", what_happened: "", raw_footage_notes: "",
  });

  const { data: allTasks } = useQuery<TaskOption[]>({
    queryKey: ["tasks"],
    queryFn: () => get("/tasks/") as Promise<TaskOption[]>,
    staleTime: 60_000,
  });

  const shootingTaskOptions = (allTasks ?? []).filter((t) => t.task_type === "shooting");

  const { data: briefs } = useQuery<ShootingBrief[]>({
    queryKey: ["shooting-briefs"],
    queryFn: async () => {
      const tasks = await get("/tasks/") as TaskOption[];
      const shootingTasks = tasks.filter((t) => t.task_type === "shooting");
      const results: ShootingBrief[] = [];
      for (const task of shootingTasks) {
        try {
          const brief = await get(`/tasks/${task.id}/shooting-brief`) as ShootingBrief;
          if (brief) results.push(brief);
        } catch { /* no brief */ }
      }
      return results;
    },
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // If user wants to create a new shooting task first
      let taskId = form.task_id;
      if (!taskId && form.new_task_title.trim()) {
        const taskRes = await fetch("/api/v1/tasks/", {
          method: "POST",
          headers,
          body: JSON.stringify({ title: form.new_task_title.trim(), task_type: "shooting", status: "todo" }),
        });
        if (!taskRes.ok) {
          const errData = await taskRes.json().catch(() => ({ detail: `Server error (${taskRes.status})` }));
          throw Object.assign(new Error("API error"), { response: { status: taskRes.status, data: errData } });
        }
        const newTask = await taskRes.json();
        taskId = String(newTask.id);
        qc.invalidateQueries({ queryKey: ["tasks"] });
      }

      const body: Record<string, string> = {};
      if (form.what_was_shot) body.what_was_shot = form.what_was_shot;
      if (form.location) body.location = form.location;
      if (form.shoot_date) {
        body.shoot_date = form.shoot_time
          ? `${form.shoot_date}T${form.shoot_time}:00`
          : form.shoot_date;
      }
      if (form.crew_present) body.crew_present = form.crew_present;
      if (form.what_happened) body.what_happened = form.what_happened;
      if (form.raw_footage_notes) body.raw_footage_notes = form.raw_footage_notes;

      const url = `/api/v1/tasks/${taskId}/shooting-brief`;
      const getRes = await fetch(url, { method: "GET", headers });
      const method = getRes.ok ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: `Server error (${res.status})` }));
        throw Object.assign(new Error("API error"), { response: { status: res.status, data: errData } });
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shooting-briefs"] });
      setOpenCreate(false);
      toast.success("Shooting brief saved");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Build calendar items for each tab
  const shootingItems: CalendarItem[] = (briefs ?? [])
    .filter((b) => !!b.shoot_date)
    .map((b) => ({ id: b.id, title: b.what_was_shot || `Task #${b.task_id}`, date: b.shoot_date!.slice(0, 10), color: "bg-purple-500", type: "shooting" }));

  // Conflict detection
  const dateCount: Record<string, number> = {};
  shootingItems.forEach((item) => { dateCount[item.date] = (dateCount[item.date] || 0) + 1; });
  const conflictDates = new Set(Object.entries(dateCount).filter(([, c]) => c > 1).map(([d]) => d));
  const shootingCalendarItems = shootingItems.map((item) => ({
    ...item,
    color: conflictDates.has(item.date) ? "bg-red-500" : "bg-purple-500",
  }));

  const moderationItems: CalendarItem[] = (allTasks ?? [])
    .filter((t) => t.status === "moderator_review" && !!t.due_date)
    .map((t) => ({ id: t.id, title: t.title, date: t.due_date!.slice(0, 10), color: "bg-orange-500", type: "moderation" }));

  const generalItems: CalendarItem[] = (allTasks ?? [])
    .filter((t) => !!t.due_date && t.status !== "done" && t.status !== "cancelled")
    .map((t) => ({ id: t.id, title: t.title, date: t.due_date!.slice(0, 10), color: "bg-blue-500", type: "task" }));

  const tabs: { key: Tab; label: string; icon: React.ElementType; color: string; items: CalendarItem[] }[] = [
    { key: "shooting", label: "Shooting", icon: CalendarDays, color: "text-purple-600", items: shootingCalendarItems },
    { key: "moderation", label: "Moderation", icon: ShieldCheck, color: "text-orange-600", items: moderationItems },
    { key: "general", label: "All Tasks", icon: CheckSquare, color: "text-blue-600", items: generalItems },
  ];

  const activeTab = tabs.find((t) => t.key === tab)!;

  return (
    <>
      <TopBar title={t("calendar")} />
      <main className="flex-1 p-3 sm:p-6 bg-gray-50 dark:bg-gray-950 min-h-full">
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Tab bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 gap-1">
              {tabs.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    tab === key
                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${tab === key ? "" : color}`} />
                  {label}
                </button>
              ))}
            </div>
            {tab === "shooting" && (
              <Button size="sm" onClick={() => setOpenCreate(true)} className="ml-auto">
                <Plus className="h-4 w-4 mr-1" />New Shooting
              </Button>
            )}
            {tab === "shooting" && conflictDates.size > 0 && (
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {conflictDates.size} conflict{conflictDates.size > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <CalendarView
              items={activeTab.items}
              onItemClick={(item) => {
                if (tab === "shooting") {
                  const brief = (briefs ?? []).find((b) => b.id === item.id);
                  if (brief) setSelected(brief);
                }
              }}
            />
          </div>

          {tab === "shooting" && conflictDates.size > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Scheduling Conflicts Detected</p>
              <div className="flex flex-wrap gap-2">
                {[...conflictDates].map((d) => (
                  <span key={d} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {format(new Date(d), "MMM d, yyyy")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Shooting brief detail */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Shooting Brief — Task #{selected?.task_id}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {selected.shoot_date && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  {format(new Date(selected.shoot_date), selected.shoot_date.includes("T") ? "EEEE, MMMM d, yyyy · h:mm a" : "EEEE, MMMM d, yyyy")}
                </div>
              )}
              {selected.location && <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><MapPin className="h-4 w-4 text-gray-400" />{selected.location}</div>}
              {selected.what_was_shot && <div><p className="text-xs text-gray-400 mb-0.5">What Was Shot</p><p>{selected.what_was_shot}</p></div>}
              {selected.crew_present && <div><p className="text-xs text-gray-400 mb-0.5">Crew</p><p>{selected.crew_present}</p></div>}
              {selected.what_happened && <div><p className="text-xs text-gray-400 mb-0.5">Notes</p><p>{selected.what_happened}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Shooting Brief</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Link to Shooting Task *</Label>
              <select
                className="mt-1 w-full h-9 border border-gray-200 dark:border-gray-600 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.task_id}
                onChange={(e) => setForm((f) => ({ ...f, task_id: e.target.value, new_task_title: "" }))}
              >
                <option value="">— Create new shooting task —</option>
                {shootingTaskOptions.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.task_code ? `[${t.task_code}] ` : ""}{t.title}
                  </option>
                ))}
              </select>
            </div>
            {!form.task_id && (
              <div>
                <Label>New Task Title *</Label>
                <Input
                  placeholder="e.g. Product shoot for Client X"
                  value={form.new_task_title}
                  onChange={(e) => setForm((f) => ({ ...f, new_task_title: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-400 mt-1">A new shooting task will be created automatically.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Shoot Date</Label><Input type="date" value={form.shoot_date} onChange={(e) => setForm((f) => ({ ...f, shoot_date: e.target.value }))} className="mt-1" /></div>
              <div><Label>Shoot Time</Label><Input type="time" value={form.shoot_time} onChange={(e) => setForm((f) => ({ ...f, shoot_time: e.target.value }))} className="mt-1" /></div>
            </div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="mt-1" /></div>
            <div><Label>What Was Shot</Label><Input value={form.what_was_shot} onChange={(e) => setForm((f) => ({ ...f, what_was_shot: e.target.value }))} className="mt-1" /></div>
            <div><Label>Crew Present</Label><Input value={form.crew_present} onChange={(e) => setForm((f) => ({ ...f, crew_present: e.target.value }))} className="mt-1" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenCreate(false)}>{t("cancel")}</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={(!form.task_id && !form.new_task_title.trim()) || createMutation.isPending}
              >
                {t("create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
