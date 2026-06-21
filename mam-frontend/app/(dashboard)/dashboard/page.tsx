"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { get, post } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderKanban, CheckSquare, AlertTriangle, DollarSign, Users, Clock, UserCheck, TrendingUp, Plus, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { ProjectStats, TaskStats, WeeklyReport, Project, Employee, Task } from "@/types";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { useAuthStore } from "@/store/auth";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CalendarView } from "@/components/shared/CalendarView";
import { PageTransition } from "@/components/shared/PageTransition";

type QAModal = "client" | "lead" | "task" | "project" | null;

export default function DashboardPage() {
  const router = useRouter();
  const { user, hasPermission } = useAuthStore();
  const qc = useQueryClient();

  // Quick action modals
  const [qaModal, setQaModal] = useState<QAModal>(null);
  const [qaName, setQaName] = useState("");
  const [qaExtra, setQaExtra] = useState("");

  const qaMutation = useMutation({
    mutationFn: () => {
      if (qaModal === "client") return post("/clients/", { company_name: qaName });
      if (qaModal === "lead") return post("/leads/", { lead_name: qaName, company_name: qaExtra || undefined });
      if (qaModal === "task") return post("/tasks/", { title: qaName, priority: qaExtra || "medium" });
      if (qaModal === "project") return post("/projects/", { name: qaName, priority: qaExtra || "medium" });
      return Promise.reject(new Error("Unknown modal"));
    },
    onSuccess: (_, __, ctx) => {
      const keyMap: Record<NonNullable<QAModal>, string[]> = {
        client: ["clients"], lead: ["leads"], task: ["tasks"], project: ["projects"],
      };
      if (qaModal) qc.invalidateQueries({ queryKey: keyMap[qaModal] });
      toast.success(`${qaModal?.charAt(0).toUpperCase()}${qaModal?.slice(1)} created`);
      setQaModal(null); setQaName(""); setQaExtra("");
    },
    onError: () => toast.error("Failed to create"),
  });

  const isAdmin = user?.is_superuser || (hasPermission("view_finance") && hasPermission("view_reports"));
  const isManager = !isAdmin && (hasPermission("view_all_tasks") || hasPermission("view_all_projects"));

  const { data: weeklyReport } = useQuery<WeeklyReport>({
    queryKey: ["ai", "weekly-report"],
    queryFn: () => get<WeeklyReport>("/ai/weekly-report"),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const { data: projectStats } = useQuery<ProjectStats>({
    queryKey: ["reports", "projects"],
    queryFn: () => get<ProjectStats>("/reports/projects/stats"),
    enabled: isAdmin || isManager,
    staleTime: 60 * 1000,
  });

  const { data: taskStats } = useQuery<TaskStats>({
    queryKey: ["reports", "tasks"],
    queryFn: () => get<TaskStats>("/reports/tasks/stats"),
    staleTime: 60 * 1000,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => get<Project[]>("/projects/"),
    enabled: isAdmin || isManager,
    staleTime: 30 * 1000,
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => get<Employee[]>("/employees/"),
    enabled: isAdmin || isManager,
    staleTime: 60 * 1000,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => get<Task[]>("/tasks/"),
    staleTime: 30 * 1000,
  });

  interface WorkingNowEmployee { id: number; full_name: string; job_title?: string; profile_image_url?: string | null; current_task?: { id: number; title: string; task_code?: string } | null; }
  const { data: workingNowData } = useQuery<WorkingNowEmployee[]>({
    queryKey: ["employees", "working-now"],
    queryFn: () => get("/employees/working-now"),
    refetchInterval: 60000,
    enabled: isAdmin || isManager,
  });

  const topProjects = [...(projects ?? [])]
    .filter((p) => p.status === "in_progress")
    .sort((a, b) => {
      const prio = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (prio[a.priority as keyof typeof prio] ?? 2) - (prio[b.priority as keyof typeof prio] ?? 2);
    })
    .slice(0, 4);

  const employeeMap = Object.fromEntries((employees ?? []).map((e) => [e.user_id ?? e.id, e]));
  const inProgressTaskEmployeeIds = new Set(
    (tasks ?? [])
      .filter((t) => t.status === "in_progress" && t.assigned_to)
      .map((t) => t.assigned_to!)
  );
  const workingToday = [...inProgressTaskEmployeeIds].map((id) => employeeMap[id]).filter(Boolean);

  const myTasks = (tasks ?? []).filter((t) => t.assigned_to === user?.id);
  const todayStr = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const myTasksToday = myTasks.filter((t) => t.due_date?.slice(0, 10) === todayStr);
  const myTasksThisWeek = myTasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d >= weekStart && d <= weekEnd;
  });
  const myTasksDone = myTasks.filter((t) => t.status === "done");
  const myTasksOverdue = myTasks.filter((t) => {
    if (!t.due_date || t.status === "done" || t.status === "cancelled") return false;
    return new Date(t.due_date) < new Date();
  });
  const myNextDeadline = myTasks
    .filter((t) => t.due_date && t.status !== "done" && t.status !== "cancelled" && new Date(t.due_date) >= new Date())
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0];

  const employeeTaskCounts = (employees ?? []).map((e) => ({
    employee: e,
    open: (tasks ?? []).filter((t) => t.assigned_to === (e.user_id ?? e.id) && !["done", "cancelled"].includes(t.status)).length,
  })).sort((a, b) => b.open - a.open);

  // Weekly task activity chart data (last 6 weeks)
  const weeklyChartData = Array.from({ length: 6 }, (_, i) => {
    const weekOffset = 5 - i;
    const wStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
    const wEnd = endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
    const allTasks = tasks ?? [];
    const completed = allTasks.filter((t) => {
      if (t.status !== "done" || !t.updated_at) return false;
      const d = new Date(t.updated_at);
      return d >= wStart && d <= wEnd;
    }).length;
    const created = allTasks.filter((t) => {
      if (!t.created_at) return false;
      const d = new Date(t.created_at);
      return d >= wStart && d <= wEnd;
    }).length;
    return { week: format(wStart, "MMM d"), completed, created };
  });

  // Calendar items from tasks (for mini calendar widget)
  const calendarTaskItems = (tasks ?? [])
    .filter((t) => !!t.due_date && !["done", "cancelled"].includes(t.status))
    .map((t) => ({
      id: t.id,
      title: t.title,
      date: t.due_date!,
      color: "bg-blue-500",
      status: t.status,
    }));

  const upcoming = (tasks ?? [])
    .filter((t) => {
      if (!t.due_date || t.status === "done" || t.status === "cancelled") return false;
      const d = new Date(t.due_date);
      const now = new Date();
      const next7 = new Date(); next7.setDate(now.getDate() + 7);
      return d >= now && d <= next7;
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  // ── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <>
        <TopBar title="Dashboard" />
        <main className="flex-1 p-3 sm:p-6 pb-20 bg-gray-50 min-h-full">
          <PageTransition>
            <div className="space-y-8">
            {/* Quick Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide"><Zap className="h-3.5 w-3.5" />Quick Actions</span>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setQaModal("client"); setQaName(""); setQaExtra(""); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add Client
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setQaModal("lead"); setQaName(""); setQaExtra(""); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add Lead
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setQaModal("task"); setQaName(""); setQaExtra("medium"); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />New Task
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setQaModal("project"); setQaName(""); setQaExtra("medium"); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />New Project
              </Button>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard index={0} title="Active Projects" value={projectStats?.by_status?.in_progress ?? "—"} icon={FolderKanban} color="blue" onClick={() => router.push("/projects")} />
            <StatCard index={1} title="Tasks Done This Week" value={weeklyReport?.tasks.completed_this_week ?? "—"} icon={CheckSquare} color="green" onClick={() => router.push("/tasks?status=done")} />
            <StatCard index={2} title="Overdue Tasks" value={taskStats?.overdue ?? "—"} icon={AlertTriangle} color="red" onClick={() => router.push("/tasks?status=overdue")} />
            <StatCard
              index={3}
              title="Revenue This Week"
              value={(weeklyReport?.finance.payments_received ?? weeklyReport?.finance.revenue_this_week) != null
                ? `$${(weeklyReport!.finance.payments_received ?? weeklyReport!.finance.revenue_this_week)!.toLocaleString()}`
                : "—"}
              icon={DollarSign}
              color="green"
              onClick={() => router.push("/finance")}
            />
            <StatCard index={4} title="New Clients This Month" value={projectStats?.active_clients_this_month ?? "—"} icon={UserCheck} color="blue" onClick={() => router.push("/clients")} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <CheckSquare className="h-4 w-4 text-blue-500" />
                    Weekly Task Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={weeklyChartData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      <Bar dataKey="created" fill="#e0e7ff" radius={[4, 4, 0, 0]} name="Created" />
                      <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Task Due Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <CalendarView
                  items={calendarTaskItems}
                  onItemClick={(item) => router.push(`/tasks/${item.id}`)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Projects + Working Today */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <FolderKanban className="h-4 w-4 text-blue-500" />
                    Top Active Projects
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-4">
                  {topProjects.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4">No active projects.</p>
                  ) : topProjects.map((p) => (
                    <div key={p.id}
                      onClick={() => router.push(`/projects/${p.id}`)}
                      className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-blue-50/50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {p.due_date ? `Due ${format(new Date(p.due_date), "MMM d")}` : "No due date"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${p.progress_percent ?? 0}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-7 text-right">{p.progress_percent ?? 0}%</span>
                        </div>
                        <StatusBadge value={p.priority} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Users className="h-4 w-4 text-emerald-500" />
                  Working Now ({(workingNowData ?? workingToday).length})
                  <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-4">
                {(workingNowData ?? workingToday).length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No one active right now.</p>
                ) : (workingNowData ?? workingToday).slice(0, 8).map((e) => (
                  <div key={e.id}
                    onClick={() => router.push(`/employees/${e.id}`)}
                    className="flex items-center gap-2.5 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-blue-50/50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {e.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{e.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {(e as typeof e & { current_task?: { title: string } | null }).current_task?.title ?? e.job_title ?? ""}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">active</span>
                  </div>
                ))}
                {(workingNowData ?? workingToday).length > 8 && (
                  <p className="text-xs text-gray-400 pt-2">+{(workingNowData ?? workingToday).length - 8} more</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tasks Overview */}
          {taskStats && (
            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <CheckSquare className="h-4 w-4 text-purple-500" />
                  Tasks Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 overflow-x-auto">
                  {Object.entries(taskStats.by_status ?? {}).map(([status, count]) => (
                    <div
                      key={status}
                      onClick={() => router.push(`/tasks?status=${status}`)}
                      className="flex-1 min-w-[90px] flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:bg-blue-50/50 hover:border-blue-200 hover:shadow-sm transition-all"
                    >
                      <p className="text-lg font-bold text-gray-900">{count}</p>
                      <StatusBadge value={status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
          </PageTransition>
        </main>

        {/* Quick Action Modal */}
        <Dialog open={!!qaModal} onOpenChange={(v) => !v && setQaModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {qaModal === "client" && "New Client"}
                {qaModal === "lead" && "New Lead"}
                {qaModal === "task" && "New Task"}
                {qaModal === "project" && "New Project"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">
                  {qaModal === "client" && "Company Name *"}
                  {qaModal === "lead" && "Lead Name *"}
                  {qaModal === "task" && "Task Title *"}
                  {qaModal === "project" && "Project Name *"}
                </Label>
                <Input
                  autoFocus
                  value={qaName}
                  onChange={(e) => setQaName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && qaName.trim() && qaMutation.mutate()}
                  placeholder={
                    qaModal === "client" ? "e.g. Acme Corp" :
                    qaModal === "lead" ? "e.g. Tech Startup" :
                    qaModal === "task" ? "e.g. Design homepage" :
                    "e.g. Q1 Campaign"
                  }
                />
              </div>
              {(qaModal === "lead") && (
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Company Name</Label>
                  <Input value={qaExtra} onChange={(e) => setQaExtra(e.target.value)} placeholder="Optional" />
                </div>
              )}
              {(qaModal === "task" || qaModal === "project") && (
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Priority</Label>
                  <select
                    className="w-full h-9 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={qaExtra}
                    onChange={(e) => setQaExtra(e.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setQaModal(null)}>Cancel</Button>
                <Button size="sm" onClick={() => qaMutation.mutate()} disabled={!qaName.trim() || qaMutation.isPending}>
                  {qaMutation.isPending ? "Creating…" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ── MANAGER DASHBOARD ────────────────────────────────────────────────────────
  if (isManager) {
    const openTasksCount = (tasks ?? []).filter((t) => !["done", "cancelled"].includes(t.status)).length;
    const inProgressCount = (tasks ?? []).filter((t) => t.status === "in_progress").length;
    const overdueCount = (tasks ?? []).filter((t) => {
      if (!t.due_date || t.status === "done" || t.status === "cancelled") return false;
      return new Date(t.due_date) < new Date();
    }).length;

    return (
      <>
        <TopBar title="Dashboard" />
        <main className="flex-1 p-3 sm:p-6 pb-12 bg-gray-50 min-h-full">
          <PageTransition>
          <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard index={0} title="Open Tasks" value={openTasksCount} icon={CheckSquare} color="blue" onClick={() => router.push("/tasks")} />
            <StatCard index={1} title="In Progress" value={inProgressCount} icon={Clock} color="yellow" onClick={() => router.push("/tasks")} />
            <StatCard index={2} title="Overdue" value={overdueCount} icon={AlertTriangle} color="red" onClick={() => router.push("/tasks")} />
            <StatCard index={3} title="Active Projects" value={projectStats?.by_status?.in_progress ?? "—"} icon={FolderKanban} color="green" onClick={() => router.push("/projects")} />
          </div>

          {hasPermission("view_clients") && projectStats && (projectStats.leads_this_month != null || projectStats.won_leads_this_month != null) && (
            <div className="grid grid-cols-2 gap-4">
              <StatCard title="Leads This Month" value={projectStats.leads_this_month ?? 0} icon={TrendingUp} color="blue" />
              <StatCard title="Won Leads This Month" value={projectStats.won_leads_this_month ?? 0} icon={UserCheck} color="green" />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <Users className="h-4 w-4 text-blue-500" />
                    Team Workload
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-4">
                  {employeeTaskCounts.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4">No employees found.</p>
                  ) : employeeTaskCounts.slice(0, 8).map(({ employee: e, open }) => (
                    <div key={e.id}
                      onClick={() => router.push(`/employees/${e.id}`)}
                      className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-blue-50/50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {e.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.full_name}</p>
                        <p className="text-xs text-gray-400">{e.job_title ?? ""}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${open > 5 ? "text-red-600" : open > 2 ? "text-amber-600" : "text-emerald-600"}`}>{open}</span>
                        <p className="text-xs text-gray-400">tasks</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-4">
                {upcoming.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No deadlines in the next 7 days.</p>
                ) : upcoming.map((t) => (
                  <div key={t.id} className="flex items-start gap-2 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-blue-50/50 -mx-2 px-2 rounded-lg transition-colors" onClick={() => router.push(`/tasks/${t.id}`)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      <p className="text-xs text-gray-400">
                        Due {t.due_date ? format(new Date(t.due_date), "MMM d") : "—"}
                      </p>
                    </div>
                    <StatusBadge value={t.priority} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <FolderKanban className="h-4 w-4 text-blue-500" />
                Active Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-4">
              {(projects ?? []).filter((p) => p.status === "in_progress").length === 0 ? (
                <p className="text-sm text-gray-400 py-4">No active projects.</p>
              ) : (projects ?? []).filter((p) => p.status === "in_progress").slice(0, 5).map((p) => (
                <div key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-blue-50/50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 truncate flex-1">{p.name}</p>
                  <div className="flex items-center gap-2.5 ml-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${p.progress_percent ?? 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{p.progress_percent ?? 0}%</span>
                    </div>
                    <StatusBadge value={p.status} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          </div>
          </PageTransition>
        </main>
      </>
    );
  }

  // ── EMPLOYEE DASHBOARD ───────────────────────────────────────────────────────
  return (
    <>
      <TopBar title={`Welcome, ${user?.full_name?.split(" ")[0] ?? "there"}`} />
      <main className="flex-1 p-3 sm:p-6 pb-12 bg-gray-50 min-h-full">
        <PageTransition>
        <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard index={0} title="Due Today" value={myTasksToday.length} icon={CheckSquare} color="blue" onClick={() => router.push("/tasks")} />
          <StatCard index={1} title="Due This Week" value={myTasksThisWeek.length} icon={Clock} color="yellow" onClick={() => router.push("/tasks")} />
          <StatCard index={2} title="Completed" value={myTasksDone.length} icon={CheckSquare} color="green" onClick={() => router.push("/tasks")} />
          <StatCard index={3} title="Overdue" value={myTasksOverdue.length} icon={AlertTriangle} color="red" onClick={() => router.push("/tasks")} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <CheckSquare className="h-4 w-4 text-blue-500" />
                  My Open Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-4">
                {myTasks.filter((t) => !["done", "cancelled"].includes(t.status)).length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">No open tasks assigned to you.</p>
                ) : myTasks
                  .filter((t) => !["done", "cancelled"].includes(t.status))
                  .sort((a, b) => {
                    const prio = { urgent: 0, high: 1, medium: 2, low: 3 };
                    return (prio[a.priority as keyof typeof prio] ?? 2) - (prio[b.priority as keyof typeof prio] ?? 2);
                  })
                  .slice(0, 8)
                  .map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-blue-50/50 -mx-2 px-2 rounded-lg transition-colors" onClick={() => router.push(`/tasks/${t.id}`)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                        <p className="text-xs text-gray-400">
                          {t.due_date ? `Due ${format(new Date(t.due_date), "MMM d")}` : "No due date"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <StatusBadge value={t.priority} />
                        <StatusBadge value={t.status} />
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <Clock className="h-4 w-4 text-orange-500" />
                Next Deadline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myNextDeadline ? (
                <div className="space-y-3 cursor-pointer hover:bg-blue-50/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => router.push(`/tasks/${myNextDeadline.id}`)}>
                  <p className="font-semibold text-gray-900">{myNextDeadline.title}</p>
                  <div className="text-3xl font-bold text-orange-500">
                    {format(new Date(myNextDeadline.due_date!), "MMM d")}
                  </div>
                  <p className="text-xs text-gray-400">
                    {Math.ceil((new Date(myNextDeadline.due_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                  </p>
                  <StatusBadge value={myNextDeadline.priority} />
                </div>
              ) : (
                <p className="text-sm text-gray-400">No upcoming deadlines.</p>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
        </PageTransition>
      </main>
    </>
  );
}
