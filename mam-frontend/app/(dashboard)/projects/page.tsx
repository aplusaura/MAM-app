"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { get, post, patch, del } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, LayoutList, LayoutGrid, CalendarDays, FolderPlus, Link, GanttChartSquare, Copy, X, Flag, Check } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FilterDropdown } from "@/components/shared/FilterDropdown";
import { ProjectHoverCard } from "@/components/shared/HoverCards";
import { KanbanBoard, KanbanItem, KanbanColumn } from "@/components/shared/KanbanBoard";
import { CalendarView, CalendarItem } from "@/components/shared/CalendarView";
import { PageTransition } from "@/components/shared/PageTransition";
import type { Project, Client, Milestone } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { format } from "date-fns";

const PROJECT_STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const TEMPLATES_KEY = "projectTemplates";

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  project_type: string;
  priority: string;
  createdAt: string;
}

function loadTemplates(): ProjectTemplate[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? "[]"); } catch { return []; }
}
function saveTemplates(t: ProjectTemplate[]) { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t)); }

interface ProjectForm {
  name: string;
  description: string;
  status: string;
  priority: string;
  start_date: string;
  due_date: string;
  budget: string;
  client_id: string;
  project_type: string;
}

interface MilestoneForm {
  title: string;
  due_date: string;
}

// ── Gantt bar color by status (inline CSS hex values — no Tailwind needed at runtime) ──
const GANTT_STATUS_COLORS: Record<string, { bar: string; track: string }> = {
  planning:    { bar: "#6b7280", track: "#d1d5db" },
  active:      { bar: "#3b82f6", track: "#bfdbfe" },
  in_progress: { bar: "#3b82f6", track: "#bfdbfe" },
  on_hold:     { bar: "#f59e0b", track: "#fde68a" },
  completed:   { bar: "#22c55e", track: "#bbf7d0" },
  cancelled:   { bar: "#ef4444", track: "#fecaca" },
};

function GanttView({ projects, onBarClick }: { projects: Project[]; onBarClick: (p: Project) => void }) {
  const [tooltip, setTooltip] = useState<{ project: Project; x: number; y: number } | null>(null);
  const today = new Date();

  // Determine overall date range: earliest start → latest due (fallback: today ±3 months)
  const allStarts = projects
    .map((p) => new Date(p.start_date ?? p.created_at ?? today))
    .filter((d) => !isNaN(d.getTime()));
  const allEnds = projects
    .map((p) => (p.due_date ? new Date(p.due_date) : null))
    .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

  const rangeStart = allStarts.length
    ? new Date(Math.min(...allStarts.map((d) => d.getTime())))
    : new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const rangeEnd = allEnds.length
    ? new Date(Math.max(...allEnds.map((d) => d.getTime())))
    : new Date(today.getFullYear(), today.getMonth() + 3, 1);

  // Snap to month boundaries
  const chartStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const chartEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth() + 1, 1);
  const totalMs = chartEnd.getTime() - chartStart.getTime();

  // Build month labels
  const months: { label: string; leftPct: number }[] = [];
  const cursor = new Date(chartStart);
  while (cursor < chartEnd) {
    const leftPct = ((cursor.getTime() - chartStart.getTime()) / totalMs) * 100;
    months.push({ label: format(cursor, "MMM yyyy"), leftPct });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Today marker
  const todayPct = ((today.getTime() - chartStart.getTime()) / totalMs) * 100;
  const showTodayLine = todayPct >= 0 && todayPct <= 100;

  const toPercent = (ms: number) => (ms / totalMs) * 100;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Scrollable timeline wrapper */}
      <div className="overflow-x-auto" style={{ minWidth: 600 }}>
        <div style={{ minWidth: 900 }}>
          {/* Header row */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-[200px] shrink-0 px-4 py-2 text-xs font-semibold text-gray-500 border-r border-gray-200 sticky left-0 bg-gray-50 z-10">
              Project
            </div>
            <div className="flex-1 relative h-8">
              {months.map((m) => (
                <span
                  key={m.label}
                  className="absolute top-2 text-xs text-gray-400 whitespace-nowrap"
                  style={{ left: `${m.leftPct}%`, transform: "translateX(-50%)" }}
                >
                  {m.label}
                </span>
              ))}
              {showTodayLine && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                  style={{ left: `${todayPct}%` }}
                />
              )}
            </div>
          </div>

          {/* Project rows */}
          {projects.map((p, i) => {
            const rowStart = new Date(p.start_date ?? p.created_at ?? today);
            const hasDue = !!p.due_date;
            const rowEnd = hasDue ? new Date(p.due_date!) : null;
            const colors = GANTT_STATUS_COLORS[p.status] ?? GANTT_STATUS_COLORS["planning"];
            const progress = p.progress_percent ?? 0;

            let barLeft = 0;
            let barWidth = 0;
            if (hasDue && rowEnd) {
              barLeft = Math.max(0, toPercent(rowStart.getTime() - chartStart.getTime()));
              barWidth = Math.min(
                100 - barLeft,
                toPercent(rowEnd.getTime() - rowStart.getTime())
              );
            }

            return (
              <div
                key={p.id}
                className="flex items-center border-b border-gray-100 last:border-b-0"
                style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
              >
                {/* Sticky name column */}
                <div
                  className="w-[200px] shrink-0 px-4 py-2.5 flex items-center gap-2 border-r border-gray-100 sticky left-0 z-10"
                  style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: colors.bar }}
                  />
                  <span
                    className={`text-xs font-medium truncate ${!hasDue ? "text-gray-400" : "text-gray-700"}`}
                    title={p.name}
                  >
                    {p.name}
                  </span>
                </div>

                {/* Timeline track */}
                <div className="flex-1 relative h-10 px-0">
                  {showTodayLine && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-300 z-10 pointer-events-none"
                      style={{ left: `${todayPct}%` }}
                    />
                  )}

                  {hasDue && barWidth > 0 && (
                    <div
                      className="absolute top-2 bottom-2 rounded-md cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        left: `${barLeft}%`,
                        width: `${barWidth}%`,
                        background: colors.track,
                      }}
                      onClick={() => onBarClick(p)}
                      onMouseEnter={(e) =>
                        setTooltip({ project: p, x: e.clientX, y: e.clientY })
                      }
                      onMouseMove={(e) =>
                        setTooltip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : null))
                      }
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {/* Progress fill */}
                      <div
                        className="h-full rounded-md"
                        style={{
                          width: `${progress}%`,
                          background: colors.bar,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              No projects to display in Gantt view.
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl space-y-0.5"
          style={{ top: tooltip.y + 14, left: tooltip.x + 10 }}
        >
          <div className="font-semibold">{tooltip.project.name}</div>
          <div className="text-gray-300">
            {tooltip.project.start_date
              ? format(new Date(tooltip.project.start_date), "MMM d, yyyy")
              : "No start"}{" "}
            &rarr;{" "}
            {tooltip.project.due_date
              ? format(new Date(tooltip.project.due_date), "MMM d, yyyy")
              : "No due date"}
          </div>
          <div className="text-gray-300 capitalize">{tooltip.project.status.replace(/_/g, " ")}</div>
          <div className="text-gray-300">{tooltip.project.progress_percent ?? 0}% complete</div>
        </div>
      )}
    </div>
  );
}

// ── Milestones dialog ─────────────────────────────────────────────────────────

function MilestonesDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm<MilestoneForm>();

  const { data: milestones = [], isLoading } = useQuery<Milestone[]>({
    queryKey: ["milestones", project.id],
    queryFn: () => get(`/projects/${project.id}/milestones`),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => post(`/projects/${project.id}/milestones`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones", project.id] });
      reset();
      toast.success("Milestone added");
    },
    onError: () => toast.error("Failed to add milestone"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ mid, is_completed }: { mid: number; is_completed: boolean }) =>
      patch(`/projects/${project.id}/milestones/${mid}`, { is_completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones", project.id] }),
    onError: () => toast.error("Failed to update milestone"),
  });

  const deleteMutation = useMutation({
    mutationFn: (mid: number) => del(`/projects/${project.id}/milestones/${mid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones", project.id] });
      toast.success("Milestone deleted");
    },
    onError: () => toast.error("Failed to delete milestone"),
  });

  const completed = milestones.filter((m) => m.is_completed).length;
  const total = milestones.length;

  // Sort: incomplete first, then completed
  const sorted = [...milestones].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return a.id - b.id;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-indigo-500" />
            {t("milestones")} — {project.name}
          </DialogTitle>
        </DialogHeader>

        {/* Progress summary */}
        {total > 0 && (
          <div className="flex items-center gap-3 py-2 px-1">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.round((completed / total) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {completed} of {total} complete
            </span>
          </div>
        )}

        {/* Milestone list */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {isLoading && (
            <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
          )}
          {!isLoading && sorted.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No milestones yet. Add one below.</p>
          )}
          {sorted.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 group"
            >
              {/* Checkbox toggle */}
              <button
                type="button"
                onClick={() => toggleMutation.mutate({ mid: m.id, is_completed: !m.is_completed })}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  m.is_completed
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-300 hover:border-green-400"
                }`}
                aria-label={m.is_completed ? "Mark incomplete" : "Mark complete"}
              >
                {m.is_completed && <Check className="h-3 w-3" />}
              </button>

              {/* Title and due date */}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm block truncate ${
                    m.is_completed ? "line-through text-gray-400" : "text-gray-700"
                  }`}
                  title={m.title}
                >
                  {m.title}
                </span>
                {m.due_date && (
                  <span className="text-xs text-gray-400">
                    {format(new Date(m.due_date), "MMM d, yyyy")}
                  </span>
                )}
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => deleteMutation.mutate(m.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 rounded"
                aria-label="Delete milestone"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add milestone form */}
        <form
          onSubmit={handleSubmit((d) =>
            createMutation.mutate({
              title: d.title,
              due_date: d.due_date || null,
            })
          )}
          className="border-t border-gray-100 pt-3 flex gap-2 items-end"
        >
          <div className="flex-1 space-y-1">
            <Label className="text-xs">{t("title")} *</Label>
            <Input
              {...register("title", { required: true })}
              placeholder="Milestone title"
              className="h-8 text-sm"
            />
          </div>
          <div className="w-36 space-y-1">
            <Label className="text-xs">{t("dueDate")}</Label>
            <Input type="date" {...register("due_date")} className="h-8 text-sm" />
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-8 shrink-0"
            disabled={createMutation.isPending}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Project | null>(null);
  const [view, setView] = useState<"table" | "kanban" | "calendar" | "gantt">("table");
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [milestonesTarget, setMilestonesTarget] = useState<Project | null>(null);
  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => { setTemplates(loadTemplates()); }, []);

  const { data, isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => get("/projects/"),
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => get("/clients/"),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => post("/projects/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      resetCreate();
      toast.success("Project created");
    },
    onError: () => toast.error("Failed to create project"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => patch(`/projects/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setEditOpen(false);
      toast.success("Project updated");
    },
    onError: () => toast.error("Failed to update project"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: () => toast.error("Failed to delete project"),
  });

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate } = useForm<ProjectForm>({
    defaultValues: { status: "planning", priority: "medium" },
  });

  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit } = useForm<ProjectForm>();

  const projects = data ?? [];
  const clientMap = Object.fromEntries((clients ?? []).map((c) => [c.id, c.company_name]));

  const statusOptions = ["all", ...PROJECT_STATUSES];
  const filtered = projects
    .filter((p) => statusFilter === "all" || p.status === statusFilter)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      patch(`/projects/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const PROJECT_KANBAN_COLUMNS: KanbanColumn[] = [
    { id: "planning", label: "Planning", color: "bg-gray-400" },
    { id: "in_progress", label: "In Progress", color: "bg-blue-500" },
    { id: "on_hold", label: "On Hold", color: "bg-yellow-500" },
    { id: "completed", label: "Completed", color: "bg-green-500" },
    { id: "cancelled", label: "Cancelled", color: "bg-red-400" },
  ];

  const projectStatusColorMap: Record<string, string> = {
    planning: "bg-gray-500", in_progress: "bg-blue-500",
    on_hold: "bg-yellow-500", completed: "bg-green-500", cancelled: "bg-red-500",
  };

  const kanbanItems: KanbanItem[] = filtered.map((p) => ({
    id: p.id,
    columnId: p.status,
    title: p.name,
    subtitle: p.client_id ? clientMap[p.client_id] : undefined,
    priority: p.priority,
    dueDate: p.due_date ? format(new Date(p.due_date), "MMM d") : undefined,
  }));

  const calendarItems: CalendarItem[] = filtered
    .filter((p) => !!p.due_date)
    .map((p) => ({
      id: p.id,
      title: p.name,
      date: p.due_date!,
      color: projectStatusColorMap[p.status] ?? "bg-blue-500",
      type: p.status,
    }));

  const handleSaveTemplate = (row: Project) => {
    const tpl: ProjectTemplate = {
      id: `tpl-${Date.now()}`,
      name: row.name,
      description: row.description ?? "",
      project_type: row.project_type ?? "",
      priority: row.priority,
      createdAt: new Date().toISOString(),
    };
    const updated = [...loadTemplates(), tpl];
    saveTemplates(updated);
    setTemplates(updated);
    toast.success("Template saved!");
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = loadTemplates().filter((t) => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
  };

  const handleApplyTemplate = (tpl: ProjectTemplate) => {
    resetCreate({
      name: tpl.name,
      description: tpl.description,
      project_type: tpl.project_type,
      priority: tpl.priority,
      status: "planning",
      start_date: "",
      due_date: "",
      budget: "",
      client_id: "",
    });
  };

  const openEdit = (project: Project) => {
    setEditTarget(project);
    resetEdit({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      priority: project.priority,
      start_date: project.start_date ?? "",
      due_date: project.due_date ?? "",
      budget: project.budget ? String(project.budget) : "",
      client_id: project.client_id ? String(project.client_id) : "",
      project_type: project.project_type ?? "",
    });
    setEditOpen(true);
  };

  const columns: Column<Project>[] = [
    {
      key: "#", label: "#",
      render: (_row, index) => <span className="text-xs text-muted-foreground">{(index ?? 0) + 1}</span>,
    },
    {
      key: "name", label: "Project", sortable: true,
      render: (row) => (
        <span className="block max-w-[180px] truncate" title={row.name}>{row.name}</span>
      ),
    },
    {
      key: "client_id", label: "Client", sortable: true,
      render: (row) => row.client_id ? (clientMap[row.client_id] ?? String(row.client_id)) : "—",
    },
    { key: "status", label: "Status", sortable: true, render: (row) => <StatusBadge value={row.status} /> },
    { key: "priority", label: "Priority", sortable: true, render: (row) => <StatusBadge value={row.priority} /> },
    {
      key: "progress_percent", label: "Progress",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-20 bg-gray-100 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${row.progress_percent ?? 0}%` }} />
          </div>
          <span className="text-xs text-gray-500">{row.progress_percent ?? 0}%</span>
        </div>
      ),
    },
    {
      key: "due_date", label: "Due", sortable: true,
      render: (p) => {
        const isOverdue = p.due_date && new Date(p.due_date) < new Date() && !["completed", "cancelled"].includes(p.status);
        return (
          <span className="flex items-center gap-1">
            {p.due_date ? format(new Date(p.due_date), "MMM d, yyyy") : "—"}
            {isOverdue && <span className="text-xs text-red-500 font-medium ml-1">Overdue</span>}
          </span>
        );
      },
    },
    { key: "budget", label: "Budget", sortable: true, render: (row) => row.budget ? `$${Number(row.budget).toLocaleString()}` : "—" },
    {
      key: "actions", label: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" className="h-7 w-7 p-0" title="Milestones" onClick={(e) => {
            e.stopPropagation();
            setMilestonesTarget(row);
          }}>
            <Flag className="h-4 w-4 text-indigo-400" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0" title="Save as Template" onClick={(e) => {
            e.stopPropagation();
            handleSaveTemplate(row);
          }}>
            <Copy className="h-4 w-4 text-gray-400" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0" onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(window.location.origin + "/projects/" + row.id);
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
      ),
    },
  ];

  const ProjectFormFields = ({ reg }: { reg: ReturnType<typeof useForm<ProjectForm>>["register"] }) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><Label>{t("name")} *</Label><Input {...reg("name", { required: true })} className="mt-1" /></div>
      <div className="col-span-2"><Label>{t("description")}</Label><Input {...reg("description")} className="mt-1" /></div>
      <div>
        <Label>{t("client")}</Label>
        <NativeSelect {...reg("client_id")} className="mt-1">
          <option value="">No client</option>
          {(clients ?? []).map((c) => <option key={c.id} value={String(c.id)}>{c.company_name}</option>)}
        </NativeSelect>
      </div>
      <div>
        <Label>{t("status")}</Label>
        <NativeSelect {...reg("status")} className="mt-1">
          {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </NativeSelect>
      </div>
      <div>
        <Label>{t("priority")}</Label>
        <NativeSelect {...reg("priority")} className="mt-1">
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </NativeSelect>
      </div>
      <div><Label>{t("projectType")}</Label><Input {...reg("project_type")} className="mt-1" placeholder="campaign, production..." /></div>
      <div><Label>{t("startDate")}</Label><Input type="date" {...reg("start_date")} className="mt-1" /></div>
      <div><Label>{t("dueDate")}</Label><Input type="date" {...reg("due_date")} className="mt-1" /></div>
      <div className="col-span-2"><Label>{t("budget")} ($)</Label><Input type="number" {...reg("budget")} className="mt-1" /></div>
    </div>
  );

  return (
    <>
      <TopBar title={t("projects")} />
      <main className="flex-1 p-3 sm:p-6 space-y-4">
        <PageTransition>
        {/* ── Toolbar ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder={`${t("search")} ${t("projects").toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[140px] max-w-xs h-8 text-sm" />
            <div className="flex-1" />
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{filtered.length} results</span>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {([
                { v: "table", icon: <LayoutList className="h-3.5 w-3.5" />, title: "Table" },
                { v: "kanban", icon: <LayoutGrid className="h-3.5 w-3.5" />, title: "Kanban" },
                { v: "calendar", icon: <CalendarDays className="h-3.5 w-3.5" />, title: "Calendar" },
                { v: "gantt", icon: <GanttChartSquare className="h-3.5 w-3.5" />, title: "Gantt" },
              ] as const).map(({ v, icon, title }) => (
                <button key={v} onClick={() => setView(v)} title={title}
                  className={`px-2.5 py-1.5 transition-colors ${view === v ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                  {icon}
                </button>
              ))}
            </div>
            <Button size="sm" className="h-8" onClick={() => { resetCreate(); setOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> {t("addNewProject")}
            </Button>
          </div>
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions.map((s) => ({ value: s, label: s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) }))}
            placeholder="Status"
            accentColor="text-blue-600"
          />
        </div>

        {/* Create Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
            <form
              onSubmit={handleCreate((d) => createMutation.mutate({
                ...d,
                budget: d.budget ? parseFloat(d.budget) : null,
                client_id: d.client_id ? parseInt(d.client_id) : null,
              }))}
              className="space-y-3"
            >
              <div className="bg-indigo-600 -mx-4 -mt-4 mb-4 px-4 pt-5 pb-4 rounded-t-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-lg"><FolderPlus className="h-4 w-4 text-white" /></div>
                  <div>
                    <h2 className="text-base font-semibold text-white">{t("addNewProject")}</h2>
                    <p className="text-xs text-indigo-100">Set up a new project for a client</p>
                  </div>
                </div>
              </div>
              {templates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Templates</p>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((tpl) => (
                      <div key={tpl.id} className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5">
                        <button
                          type="button"
                          className="text-xs font-medium text-indigo-700 hover:text-indigo-900 transition-colors"
                          onClick={() => handleApplyTemplate(tpl)}
                        >
                          {tpl.name}
                        </button>
                        <button
                          type="button"
                          className="ml-1 text-indigo-400 hover:text-red-500 transition-colors"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          aria-label="Delete template"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-1" />
                </div>
              )}
              <ProjectFormFields reg={regCreate} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">{createMutation.isPending ? `${t("save")}...` : t("save")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <DialogHeader><DialogTitle>{t("editProject")}</DialogTitle></DialogHeader>
            {editTarget && (
              <form
                onSubmit={handleEdit((d) => updateMutation.mutate({
                  id: editTarget.id,
                  body: {
                    ...d,
                    budget: d.budget ? parseFloat(d.budget) : null,
                    client_id: d.client_id ? parseInt(d.client_id) : null,
                  },
                }))}
                className="space-y-3"
              >
                <ProjectFormFields reg={regEdit} />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>{t("cancel")}</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? `${t("save")}...` : t("save")}</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {view === "table" && (
          <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage={t("noData")}
            onRowClick={(row) => router.push(`/projects/${row.id}`)}
            renderHoverCard={(row) => (
              <ProjectHoverCard
                project={row}
                clientName={clients?.find(c => c.id === row.client_id)?.company_name}
              />
            )}
            exportable paginated defaultPageSize={10}
          />
        )}

        {view === "kanban" && (
          <KanbanBoard
            columns={PROJECT_KANBAN_COLUMNS}
            items={kanbanItems}
            onMove={(itemId, newColumnId) => updateStatusMutation.mutate({ id: itemId, status: newColumnId })}
          />
        )}

        {view === "calendar" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <CalendarView items={calendarItems} onItemClick={(item) => router.push(`/projects/${item.id}`)} />
          </div>
        )}

        {view === "gantt" && (
          <GanttView
            projects={filtered}
            onBarClick={(p) => router.push(`/projects/${p.id}`)}
          />
        )}
        </PageTransition>
      </main>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`${t("delete")} ${t("projects")}`}
        description={`Are you sure you want to delete "${confirmTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => { if (confirmTarget) { deleteMutation.mutate(confirmTarget.id); setConfirmOpen(false); } }}
        loading={deleteMutation.isPending}
      />

      {/* Milestones Dialog */}
      {milestonesTarget && (
        <MilestonesDialog
          project={milestonesTarget}
          open={!!milestonesTarget}
          onOpenChange={(v) => { if (!v) setMilestonesTarget(null); }}
        />
      )}
    </>
  );
}
