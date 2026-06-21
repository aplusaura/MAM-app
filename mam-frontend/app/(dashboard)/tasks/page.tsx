"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { TopBar } from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Zap, Pencil, Trash2, RotateCcw, FileText, LayoutList, LayoutGrid, CalendarDays, CheckSquare, Timer, Clock, Play, Square, Link } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TaskHoverCard } from "@/components/shared/HoverCards";
import { KanbanBoard, KanbanItem, KanbanColumn } from "@/components/shared/KanbanBoard";
import { CalendarView, CalendarItem } from "@/components/shared/CalendarView";
import { PageTransition } from "@/components/shared/PageTransition";
import type { Task, Project, Employee, ShootingBrief } from "@/types";
import { format } from "date-fns";
import confetti from "canvas-confetti";

const ACTIVE_TIMER_KEY = "mam_active_timer";

interface ActiveTimer {
  taskId: number;
  taskTitle: string;
  startTime: string; // ISO string
}

function formatElapsed(startIso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

interface LogTimeForm {
  hours: string;
  description: string;
  date: string;
}

const STATUS_OPTIONS = ["todo", "in_progress", "review", "revisions_needed", "done", "cancelled"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"];
const TASK_TYPES = [
  { value: "video_editing", label: "Video Editing" },
  { value: "design", label: "Design" },
  { value: "content_writing", label: "Content Writing" },
  { value: "shooting", label: "Shooting" },
  { value: "social_media", label: "Social Media" },
];

const TASK_TYPE_DEPT_ID: Record<string, number> = {
  video_editing: 5, shooting: 5, design: 6, content_writing: 4, social_media: 7,
};

const getDifficulty = (hours: number | undefined): string => {
  if (!hours) return "—";
  if (hours <= 2) return "Easy";
  if (hours <= 4) return "Medium";
  if (hours <= 8) return "Hard";
  return "Very Hard";
};

const getDifficultyColor = (hours: number | undefined): string => {
  if (!hours) return "";
  if (hours <= 2) return "text-green-600";
  if (hours <= 4) return "text-yellow-600";
  if (hours <= 8) return "text-orange-600";
  return "text-red-600";
};

interface TaskForm {
  title: string;
  description: string;
  status: string;
  priority: string;
  task_type: string;
  due_date: string;
  project_id: string;
  estimated_hours: string;
  assigned_to: string;
  revision_notes: string;
  revision_type: string;
}

interface BriefForm {
  what_was_shot: string;
  location: string;
  shoot_date: string;
  crew_present: string;
  what_happened: string;
  raw_footage_notes: string;
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefTarget, setBriefTarget] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [dateFilter, setDateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Task | null>(null);
  const [view, setView] = useState<"table" | "kanban" | "calendar">("table");
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(ACTIVE_TIMER_KEY);
      return stored ? (JSON.parse(stored) as ActiveTimer) : null;
    } catch {
      return null;
    }
  });
  const [elapsedDisplay, setElapsedDisplay] = useState<string>("00:00:00");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [logTimeTarget, setLogTimeTarget] = useState<Task | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkSelectedRows, setBulkSelectedRows] = useState<Task[]>([]);
  const [bulkStatus, setBulkStatus] = useState(STATUS_OPTIONS[0]);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => get("/tasks/"),
    refetchInterval: 30_000,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => get("/projects/"),
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => get("/employees/"),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => post("/tasks/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      resetCreate();
      toast.success("Task created");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => patch(`/tasks/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setEditOpen(false);
      toast.success("Task updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => patch(`/tasks/${id}`, { status }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      if (variables.status === "done") {
        confetti({ particleCount: 50, spread: 65, origin: { y: 0.7 }, colors: ["#FFD700", "#FFA500", "#60a5fa"] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete task"),
  });

  const createForm = useForm<TaskForm>({ defaultValues: { status: "todo", priority: "medium", revision_type: "internal" } });
  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate, watch: watchCreate, setValue: setValueCreate } = createForm;

  const editForm = useForm<TaskForm>();
  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit, watch: watchEdit, setValue: setValueEdit } = editForm;

  const briefForm = useForm<BriefForm>();
  const { register: regBrief, handleSubmit: handleBriefSubmit, reset: resetBrief } = briefForm;

  const logTimeForm = useForm<LogTimeForm>({
    defaultValues: { hours: "", description: "", date: format(new Date(), "yyyy-MM-dd") },
  });
  const { register: regLog, handleSubmit: handleLogSubmit, reset: resetLog } = logTimeForm;

  // --- Timer interval tick ---
  useEffect(() => {
    if (activeTimer) {
      setElapsedDisplay(formatElapsed(activeTimer.startTime));
      intervalRef.current = setInterval(() => {
        setElapsedDisplay(formatElapsed(activeTimer.startTime));
      }, 1000);
    } else {
      setElapsedDisplay("00:00:00");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTimer]);

  const { data: briefData } = useQuery<ShootingBrief | null>({
    queryKey: ["shooting-brief", briefTarget?.id],
    queryFn: () => briefTarget
      ? (get(`/tasks/${briefTarget.id}/shooting-brief`) as Promise<ShootingBrief>).catch(() => null)
      : Promise.resolve(null),
    enabled: !!briefTarget,
  });

  const briefMutation = useMutation({
    mutationFn: ({ taskId, body, isNew }: { taskId: number; body: object; isNew: boolean }) =>
      isNew ? post(`/tasks/${taskId}/shooting-brief`, body) : patch(`/tasks/${taskId}/shooting-brief`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shooting-brief", briefTarget?.id] });
      toast.success("Brief saved");
      setBriefOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openBrief = (task: Task) => {
    setBriefTarget(task);
    resetBrief({ what_was_shot: "", location: "", shoot_date: "", crew_present: "", what_happened: "", raw_footage_notes: "" });
    setBriefOpen(true);
  };

  // --- Log Time mutation ---
  const logTimeMutation = useMutation({
    mutationFn: ({ taskId, body }: { taskId: number; body: object }) =>
      post(`/tasks/${taskId}/time-entries`, body),
    onSuccess: () => {
      toast.success("Time logged");
      setLogTimeOpen(false);
      resetLog({ hours: "", description: "", date: format(new Date(), "yyyy-MM-dd") });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openLogTime = (task: Task) => {
    setLogTimeTarget(task);
    resetLog({ hours: "", description: "", date: format(new Date(), "yyyy-MM-dd") });
    setLogTimeOpen(true);
  };

  // --- Timer functions ---
  const startTimer = (task: Task) => {
    if (activeTimer) {
      toast.error("A timer is already running. Stop it first.");
      return;
    }
    const timer: ActiveTimer = {
      taskId: task.id,
      taskTitle: task.title,
      startTime: new Date().toISOString(),
    };
    localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(timer));
    setActiveTimer(timer);
    toast.success(`Timer started for "${task.title}"`);
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    const endTime = new Date();
    const startTime = new Date(activeTimer.startTime);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
    try {
      await post(`/tasks/${activeTimer.taskId}/time-entries`, {
        started_at: activeTimer.startTime,
        ended_at: endTime.toISOString(),
        duration_minutes: durationMinutes,
      });
      toast.success(`Timer stopped. Logged ${durationMinutes} min for "${activeTimer.taskTitle}"`);
    } catch {
      toast.error("Failed to save time entry — duration not logged");
    }
    localStorage.removeItem(ACTIVE_TIMER_KEY);
    setActiveTimer(null);
  };

  const createTaskType = watchCreate("task_type");
  const editTaskType = watchEdit("task_type");
  const editStatus = watchEdit("status");

  const tasks = data ?? [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const filtered = tasks
    .filter((t) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "overdue") {
        if (!t.due_date || t.status === "done" || t.status === "cancelled") return false;
        return new Date(t.due_date) < new Date();
      }
      return t.status === statusFilter;
    })
    .filter((t) => typeFilter === "all" || t.task_type === typeFilter)
    .filter((t) => {
      if (dateFilter === "all") return true;
      if (!t.due_date) return false;
      const d = new Date(t.due_date); d.setHours(0, 0, 0, 0);
      if (dateFilter === "today") return d.getTime() === today.getTime();
      if (dateFilter === "this_week") return d >= weekStart && d <= weekEnd;
      if (dateFilter === "this_month") return d >= monthStart && d <= monthEnd;
      return true;
    })
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));

  const projectMap = Object.fromEntries((projects ?? []).map((p) => [p.id, p.name]));
  const employeeMap = Object.fromEntries((employees ?? []).map((e) => [e.user_id ?? e.id, e.full_name]));

  const KANBAN_COLUMNS: KanbanColumn[] = [
    { id: "todo", label: "To Do", color: "bg-gray-400" },
    { id: "in_progress", label: "In Progress", color: "bg-blue-500" },
    { id: "review", label: "Review", color: "bg-yellow-500" },
    { id: "revisions_needed", label: "Revisions", color: "bg-orange-500" },
    { id: "done", label: "Done", color: "bg-green-500" },
  ];

  const kanbanItems: KanbanItem[] = filtered.map((t) => ({
    id: t.id,
    columnId: t.status === "cancelled" ? "todo" : t.status,
    title: t.title,
    subtitle: t.project_id ? projectMap[t.project_id] : undefined,
    priority: t.priority,
    badge: t.task_code,
    assignee: t.assigned_to ? employeeMap[t.assigned_to] : undefined,
    dueDate: t.due_date ? format(new Date(t.due_date), "MMM d") : undefined,
  }));

  const typeColorMap: Record<string, string> = {
    video_editing: "bg-blue-500", design: "bg-purple-500",
    content_writing: "bg-emerald-500", shooting: "bg-orange-500", social_media: "bg-pink-500",
  };

  const calendarItems: CalendarItem[] = filtered
    .filter((t) => !!t.due_date)
    .map((t) => ({
      id: t.id,
      title: t.title,
      date: t.due_date!,
      color: typeColorMap[t.task_type ?? ""] ?? "bg-blue-500",
      type: t.task_type,
      status: t.status,
    }));

  const openEdit = (task: Task) => {
    setEditTarget(task);
    resetEdit({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      task_type: task.task_type ?? "",
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
      project_id: task.project_id ? String(task.project_id) : "",
      estimated_hours: task.estimated_hours ? String(task.estimated_hours) : "",
      assigned_to: task.assigned_to ? String(task.assigned_to) : "",
      revision_notes: task.revision_notes ?? "",
      revision_type: task.revision_type ?? "internal",
    });
    setEditOpen(true);
  };

  const columns: Column<Task>[] = [
    {
      key: "#", label: "#",
      render: (_row, index) => <span className="text-xs text-muted-foreground">{(index ?? 0) + 1}</span>,
    },
    {
      key: "task_code", label: "Code",
      render: (row) => row.task_code ? (
        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{row.task_code}</span>
      ) : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: "title", label: "Title", sortable: true,
      render: (row) => (
        <span className="block max-w-[180px] truncate" title={row.title}>{row.title}</span>
      ),
    },
    {
      key: "task_type", label: "Type", sortable: true,
      render: (row) => {
        if (!row.task_type) return "—";
        const typeColor: Record<string, string> = {
          video_editing: "bg-blue-100 text-blue-700",
          design: "bg-purple-100 text-purple-700",
          content_writing: "bg-emerald-100 text-emerald-700",
          shooting: "bg-orange-100 text-orange-700",
          social_media: "bg-pink-100 text-pink-700",
          other: "bg-gray-100 text-gray-600",
        };
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeColor[row.task_type] ?? "bg-gray-100 text-gray-600"}`}>
            {row.task_type.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      key: "project_id", label: "Project",
      render: (row) => row.project_id ? (projectMap[row.project_id] ?? String(row.project_id)) : "—",
    },
    {
      key: "assigned_to", label: "Assigned To",
      render: (row) => row.assigned_to ? (employeeMap[row.assigned_to] ?? String(row.assigned_to)) : <span className="text-muted-foreground text-xs">Unassigned</span>,
    },
    {
      key: "team_leader_name", label: "Team Leader",
      render: (row) => (row as Task & { team_leader_name?: string }).team_leader_name ?? <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "account_manager_name", label: "Account Mgr",
      render: (row) => (row as Task & { account_manager_name?: string }).account_manager_name ?? <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      key: "status", label: "Status", sortable: true,
      render: (row) => (
        <Select value={row.status} onValueChange={(v) => v && updateStatusMutation.mutate({ id: row.id, status: v })}>
          <SelectTrigger className="h-7 w-32 text-xs" onClick={(e) => e.stopPropagation()}>
            <SelectValue><StatusBadge value={row.status} /></SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}><StatusBadge value={s} /></SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    { key: "priority", label: "Priority", sortable: true, render: (row) => <StatusBadge value={row.priority} /> },
    {
      key: "revision_type", label: "Revision",
      render: (row) => {
        if (row.status !== "revisions_needed") return null;
        const isExternal = row.revision_type === "external";
        return (
          <div className="flex flex-col gap-0.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isExternal ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}>
              <RotateCcw className="h-2.5 w-2.5" />
              {isExternal ? "Client" : "Internal"}
            </span>
            {(row.revision_count ?? 0) > 0 && (
              <span className="text-xs text-gray-400">Round #{row.revision_count}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "estimated_hours", label: "Difficulty",
      render: (row) => (
        <span className={`text-xs font-medium ${getDifficultyColor(row.estimated_hours)}`}>
          {getDifficulty(row.estimated_hours)}
          {row.estimated_hours ? ` (${row.estimated_hours}h)` : ""}
        </span>
      ),
    },
    {
      key: "due_date", label: "Deadline", sortable: true,
      render: (t) => {
        const isOverdue = t.due_date && new Date(t.due_date) < new Date() && !["done", "cancelled"].includes(t.status);
        return <span className={isOverdue ? "text-red-500 font-medium" : ""}>{t.due_date ? format(new Date(t.due_date), "MMM d, yyyy") : "—"}</span>;
      },
    },
    {
      key: "created_at", label: "Created",
      render: (row) => row.created_at ? format(new Date(row.created_at), "MMM d") : "—",
    },
    {
      key: "actions", label: "",
      render: (row) => {
        const isTimerRunning = activeTimer?.taskId === row.id;
        return (
          <div className="flex items-center gap-1">
            {row.task_type === "shooting" && (
              <Button variant="ghost" size="icon" title="Shooting Brief" onClick={(e) => { e.stopPropagation(); openBrief(row); }}>
                <FileText className="h-4 w-4 text-orange-400" />
              </Button>
            )}
            {/* Log Time button */}
            <Button
              variant="ghost"
              size="icon"
              title="Log Time"
              onClick={(e) => { e.stopPropagation(); openLogTime(row); }}
            >
              <Clock className="h-4 w-4 text-indigo-400" />
            </Button>
            {/* Timer button */}
            {isTimerRunning ? (
              <button
                title="Stop timer"
                onClick={(e) => { e.stopPropagation(); stopTimer(); }}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-mono font-semibold transition-colors"
              >
                <Square className="h-3 w-3 fill-current flex-shrink-0" />
                <span className="tabular-nums">{elapsedDisplay}</span>
              </button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                title="Start Timer"
                onClick={(e) => { e.stopPropagation(); startTimer(row); }}
                className={activeTimer ? "opacity-40 cursor-not-allowed" : "text-green-600 hover:text-green-700"}
              >
                <Play className="h-4 w-4 fill-current" />
              </Button>
            )}
            <Button variant="ghost" className="h-7 w-7 p-0" onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(window.location.origin + "/tasks/" + row.id);
              toast.success("Link copied!");
            }}>
              <Link className="h-4 w-4 text-gray-400" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
              <Pencil className="h-4 w-4 text-gray-400" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => {
              e.stopPropagation();
              setConfirmTarget(row);
              setConfirmOpen(true);
            }}>
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        );
      },
    },
  ];

  const TaskFormFields = ({
    reg,
    taskType,
    currentStatus,
    setValue,
  }: {
    reg: ReturnType<typeof useForm<TaskForm>>["register"];
    taskType: string;
    currentStatus?: string;
    setValue?: (name: keyof TaskForm, value: string) => void;
  }) => {
    const deptId = taskType ? TASK_TYPE_DEPT_ID[taskType] : null;
    const filteredEmployees = deptId
      ? (employees ?? []).filter((e) => e.department_id === deptId)
      : (employees ?? []);

    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Title *</Label><Input {...reg("title", { required: true })} className="mt-1" /></div>
        <div className="col-span-2"><Label>Description</Label><Input {...reg("description")} className="mt-1" /></div>
        <div>
          <Label>Task Type</Label>
          <NativeSelect {...reg("task_type")} className="mt-1">
            <option value="">Select type (auto-assigns)</option>
            {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </NativeSelect>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500" />Auto-assigns best available employee</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Assign To (override)</Label>
            {user?.id && setValue && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setValue("assigned_to", String(user.id))}
              >
                Assign to myself
              </button>
            )}
          </div>
          <NativeSelect {...reg("assigned_to")} className="mt-0">
            <option value="">Auto-assign</option>
            {filteredEmployees.map((e) => <option key={e.id} value={String(e.user_id ?? e.id)}>{e.full_name}</option>)}
          </NativeSelect>
          {deptId && (
            <p className="text-xs text-muted-foreground mt-1">Showing department members only</p>
          )}
        </div>
        <div>
          <Label>Project</Label>
          <NativeSelect {...reg("project_id")} className="mt-1">
            <option value="">No project</option>
            {(projects ?? []).map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </NativeSelect>
        </div>
        <div>
          <Label>Priority</Label>
          <NativeSelect {...reg("priority")} className="mt-1">
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </NativeSelect>
        </div>
        <div>
          <Label>Status</Label>
          <NativeSelect {...reg("status")} className="mt-1">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </NativeSelect>
        </div>
        <div><Label>Deadline</Label><Input type="date" {...reg("due_date")} className="mt-1" /></div>
        <div><Label>Est. Hours</Label><Input type="number" step="0.5" {...reg("estimated_hours")} className="mt-1" /></div>
        {(currentStatus === "revisions_needed" || currentStatus === "review") && (
          <>
            <div className="col-span-2">
              <Label>Revision Type</Label>
              <NativeSelect {...reg("revision_type")} className="mt-1">
                <option value="internal">Internal (Team)</option>
                <option value="external">External (Client)</option>
              </NativeSelect>
            </div>
            <div className="col-span-2">
              <Label>Revision Notes</Label>
              <textarea
                {...reg("revision_notes")}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                placeholder="Describe what needs to be revised..."
              />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <TopBar title="Tasks" />
      <main className="flex-1 p-3 sm:p-6 space-y-4 bg-gray-50 min-h-full">
        <PageTransition>
        {/* ── Toolbar ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2.5">
          {/* Row 1: Search + View + New */}
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[140px] max-w-xs h-8 text-sm" />
            <div className="flex-1" />
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{filtered.length} results</span>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {([
                { v: "table", icon: <LayoutList className="h-3.5 w-3.5" />, title: "Table" },
                { v: "kanban", icon: <LayoutGrid className="h-3.5 w-3.5" />, title: "Kanban" },
                { v: "calendar", icon: <CalendarDays className="h-3.5 w-3.5" />, title: "Calendar" },
              ] as const).map(({ v, icon, title }) => (
                <button key={v} onClick={() => setView(v)} title={title}
                  className={`px-2.5 py-1.5 transition-colors ${view === v ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                  {icon}
                </button>
              ))}
            </div>
            <Button size="sm" className="h-8" onClick={() => { resetCreate(); setOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Task
            </Button>
          </div>
          {/* Row 2: Status | Date | Type */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5">
              {(["all","todo","in_progress","review","revisions_needed","done","overdue"] as const).map((v) => (
                <button key={v} onClick={() => setStatusFilter(v)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter === v ? "bg-white shadow-sm text-blue-600 font-semibold" : "text-gray-500 hover:text-gray-700"}`}>
                  {v === "all" ? "All" : v === "in_progress" ? "In Progress" : v === "revisions_needed" ? "Revisions" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5">
              {(["all","today","this_week","this_month"] as const).map((v) => (
                <button key={v} onClick={() => setDateFilter(v)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${dateFilter === v ? "bg-white shadow-sm text-indigo-600 font-semibold" : "text-gray-500 hover:text-gray-700"}`}>
                  {v === "all" ? "All Dates" : v === "today" ? "Today" : v === "this_week" ? "This Week" : "This Month"}
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5 flex-wrap">
              {([{ value: "all", label: "All Types" }, ...TASK_TYPES] as const).map((v) => (
                <button key={v.value} onClick={() => setTypeFilter(v.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${typeFilter === v.value ? "bg-white shadow-sm text-violet-600 font-semibold" : "text-gray-500 hover:text-gray-700"}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Create Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <form
              onSubmit={handleCreate((d) => createMutation.mutate({
                ...d,
                project_id: d.project_id ? parseInt(d.project_id) : null,
                assigned_to: d.assigned_to ? parseInt(d.assigned_to) : null,
                estimated_hours: d.estimated_hours ? parseFloat(d.estimated_hours) : null,
                task_type: d.task_type || null,
              }))}
              className="space-y-3"
            >
              <div className="bg-blue-600 -mx-4 -mt-4 mb-4 px-4 pt-5 pb-4 rounded-t-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-lg"><CheckSquare className="h-4 w-4 text-white" /></div>
                  <div>
                    <h2 className="text-base font-semibold text-white">New Task</h2>
                    <p className="text-xs text-blue-100">Create a new task and assign it</p>
                  </div>
                </div>
              </div>
              <TaskFormFields reg={regCreate} taskType={createTaskType} setValue={setValueCreate} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">{createMutation.isPending ? "Saving..." : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
            {editTarget && (
              <form
                onSubmit={handleEdit((d) => updateMutation.mutate({
                  id: editTarget.id,
                  body: {
                    ...d,
                    project_id: d.project_id ? parseInt(d.project_id) : null,
                    assigned_to: d.assigned_to ? parseInt(d.assigned_to) : null,
                    estimated_hours: d.estimated_hours ? parseFloat(d.estimated_hours) : null,
                    task_type: d.task_type || null,
                    revision_notes: d.revision_notes || null,
                    revision_type: d.revision_type || null,
                  },
                }))}
                className="space-y-3"
              >
                <TaskFormFields reg={regEdit} taskType={editTaskType} currentStatus={editStatus} setValue={setValueEdit} />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save"}</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Shooting Brief Dialog */}
        <Dialog open={briefOpen} onOpenChange={(v) => { setBriefOpen(v); if (!v) setBriefTarget(null); }}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 text-orange-500" />
                Shooting Brief — {briefTarget?.title}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleBriefSubmit((d) => {
                if (!briefTarget) return;
                briefMutation.mutate({ taskId: briefTarget.id, body: d, isNew: !briefData });
              })}
              className="space-y-3"
            >
              <div>
                <Label>What was shot *</Label>
                <textarea
                  {...regBrief("what_was_shot")}
                  defaultValue={briefData?.what_was_shot ?? ""}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Describe what was filmed — scenes, subjects, content..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Location</Label>
                  <Input {...regBrief("location")} defaultValue={briefData?.location ?? ""} className="mt-1" placeholder="Where was it shot?" />
                </div>
                <div>
                  <Label>Shoot Date</Label>
                  <Input type="date" {...regBrief("shoot_date")} defaultValue={briefData?.shoot_date?.slice(0, 10) ?? ""} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Crew Present</Label>
                <Input {...regBrief("crew_present")} defaultValue={briefData?.crew_present ?? ""} className="mt-1" placeholder="Who was on set?" />
              </div>
              <div>
                <Label>What Happened / Notes</Label>
                <textarea
                  {...regBrief("what_happened")}
                  defaultValue={briefData?.what_happened ?? ""}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="How did the shoot go? Any issues, deviations from plan..."
                />
              </div>
              <div>
                <Label>Raw Footage Notes</Label>
                <textarea
                  {...regBrief("raw_footage_notes")}
                  defaultValue={briefData?.raw_footage_notes ?? ""}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px]"
                  placeholder="Notes on footage quality, usable clips, anything the editor should know..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setBriefOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={briefMutation.isPending}>
                  {briefMutation.isPending ? "Saving..." : briefData ? "Update Brief" : "Save Brief"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {view === "table" && (
          <div className="overflow-x-auto">
            <DataTable
                columns={columns}
                data={filtered}
                isLoading={isLoading}
                emptyMessage="No tasks found."
                onRowClick={(row) => router.push(`/tasks/${row.id}`)}
                bulkActionLabel="Bulk Update"
                onBulkAction={(rows) => { setBulkSelectedRows(rows as Task[]); setBulkStatus(STATUS_OPTIONS[0]); setBulkDialogOpen(true); }}
                renderHoverCard={(row) => (
                  <TaskHoverCard
                    task={row}
                    assigneeName={employees?.find(e => e.user_id === row.assigned_to || e.id === row.assigned_to)?.full_name}
                    projectName={projects?.find(p => p.id === row.project_id)?.name}
                  />
                )}
                exportable
                paginated
                defaultPageSize={15}
              />
            </div>
        )}

        {view === "kanban" && (
          <KanbanBoard
            columns={KANBAN_COLUMNS}
            items={kanbanItems}
            onMove={(itemId, newColumnId) => updateStatusMutation.mutate({ id: itemId, status: newColumnId })}
          />
        )}

        {view === "calendar" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <CalendarView
              items={calendarItems}
              onItemClick={(item) => router.push(`/tasks/${item.id}`)}
            />
          </div>
        )}
        </PageTransition>
      </main>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Task"
        description={`Are you sure you want to delete "${confirmTarget?.title}"? This action cannot be undone.`}
        onConfirm={() => { if (confirmTarget) { deleteMutation.mutate(confirmTarget.id); setConfirmOpen(false); } }}
        loading={deleteMutation.isPending}
      />

      {/* Bulk Update Status Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk Update Status</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{bulkSelectedRows.length} task{bulkSelectedRows.length !== 1 ? "s" : ""} selected</p>
          <div className="space-y-2 pt-1">
            <Label>New Status</Label>
            <NativeSelect value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="mt-1">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </NativeSelect>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button
              type="button"
              onClick={async () => {
                await Promise.all(bulkSelectedRows.map((row) => patch(`/tasks/${row.id}`, { status: bulkStatus })));
                qc.invalidateQueries({ queryKey: ["tasks"] });
                qc.invalidateQueries({ queryKey: ["projects"] });
                toast.success(`Updated ${bulkSelectedRows.length} task${bulkSelectedRows.length !== 1 ? "s" : ""} to "${bulkStatus.replace(/_/g, " ")}"`);
                setBulkDialogOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Time Dialog */}
      <Dialog open={logTimeOpen} onOpenChange={(v) => { setLogTimeOpen(v); if (!v) setLogTimeTarget(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              Log Time — {logTimeTarget?.title}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleLogSubmit((d) => {
              if (!logTimeTarget) return;
              const hours = parseFloat(d.hours);
              if (!hours || hours <= 0) { toast.error("Enter a valid number of hours"); return; }
              const durationMinutes = Math.round(hours * 60);
              const dateVal = d.date || format(new Date(), "yyyy-MM-dd");
              logTimeMutation.mutate({
                taskId: logTimeTarget.id,
                body: {
                  duration_minutes: durationMinutes,
                  notes: d.description || null,
                  started_at: `${dateVal}T00:00:00Z`,
                },
              });
            })}
            className="space-y-3 pt-1"
          >
            <div>
              <Label>Hours Spent *</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                placeholder="e.g. 1.5"
                {...regLog("hours", { required: true })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" {...regLog("date")} className="mt-1" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <textarea
                {...regLog("description")}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px]"
                placeholder="What did you work on?"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setLogTimeOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={logTimeMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {logTimeMutation.isPending ? "Saving..." : "Log Time"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Active Timer Banner */}
      {activeTimer && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white rounded-xl shadow-xl px-4 py-3 min-w-[320px]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <Timer className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{activeTimer.taskTitle}</span>
          </div>
          <span className="font-mono text-base font-bold text-red-400 tabular-nums flex-shrink-0">
            {elapsedDisplay}
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 px-3 text-xs flex-shrink-0"
            onClick={stopTimer}
          >
            <Square className="h-3 w-3 mr-1 fill-current" /> Stop
          </Button>
        </div>
      )}
    </>
  );
}
