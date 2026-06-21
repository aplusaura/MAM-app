"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del, getErrorMessage, getMediaUrl } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { PageTransition } from "@/components/shared/PageTransition";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, Clock, User, Tag, Briefcase,
  MessageSquare, History, CheckSquare, Send, AlertTriangle, Pencil, X, Check, Link2, ExternalLink,
  Paperclip, Trash2, Upload, FileText, PlayCircle, StopCircle, Plus, Timer,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { TaskDetail, Employee, Project, ShootingBrief, TaskAttachment, TimeEntry } from "@/types";
import { useAuthStore } from "@/store/auth";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov"]);

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isImage(name: string): boolean {
  return IMAGE_EXTENSIONS.has(getFileExtension(name));
}

function isVideo(name: string): boolean {
  return VIDEO_EXTENSIONS.has(getFileExtension(name));
}

interface MediaPreviewModalProps {
  url: string;
  name: string;
  onClose: () => void;
}

function MediaPreviewModal({ url, name, onClose }: MediaPreviewModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage(name) ? (
          <img
            src={url}
            alt={name}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const TASK_TYPE_LABEL: Record<string, string> = {
  video_editing: "Video Editing",
  design: "Design",
  content_writing: "Content Writing",
  shooting: "Shooting",
  social_media: "Social Media",
  other: "Other",
};

const STATUS_FLOW: Record<string, string> = {
  todo: "in_progress",
  in_progress: "review",
  review: "done",
  revisions_needed: "in_progress",
  done: "todo",
  cancelled: "todo",
};

const STATUS_FLOW_LABEL: Record<string, string> = {
  todo: "Start Task",
  in_progress: "Submit for Review",
  review: "Mark as Done",
  revisions_needed: "Back to In Progress",
  done: "Reopen Task",
  cancelled: "Reopen Task",
};

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

function fmtDateTime(d?: string | null): string {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy · h:mm a"); } catch { return d; }
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const taskId = Number(id);
  const { user, hasPermission } = useAuthStore();

  const [comment, setComment] = useState("");
  const [finalLinkEdit, setFinalLinkEdit] = useState(false);
  const [finalLinkValue, setFinalLinkValue] = useState("");
  const [briefEditMode, setBriefEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localFiles, setLocalFiles] = useState<{ id: number; original_name: string; file_url?: string | null; size_bytes?: number | null; created_at: string }[]>([]);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [timeNotes, setTimeNotes] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; name: string } | null>(null);
  const [briefForm, setBriefForm] = useState({
    what_was_shot: "", location: "", shoot_date: "",
    crew_present: "", what_happened: "", raw_footage_notes: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "", description: "", priority: "medium", status: "",
    assigned_to: "" as string, project_id: "" as string,
    due_date: "", start_date: "", estimated_hours: "" as string,
    task_type: "",
  });

  const { data: task, isLoading } = useQuery<TaskDetail>({
    queryKey: ["task", taskId],
    queryFn: () => get(`/tasks/${taskId}`),
    staleTime: 10000,
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => get("/employees/").catch(() => []),
    staleTime: 60000,
  });

  const { data: employeeNames } = useQuery<{ id: number; user_id: number | null; full_name: string }[]>({
    queryKey: ["employee-names"],
    queryFn: () => get("/employees/names"),
    staleTime: 120000,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => get("/projects/"),
    staleTime: 60000,
  });

  const { data: serverFiles } = useQuery<{ id: number; original_name: string; file_url?: string | null; size_bytes?: number | null; created_at: string }[]>({
    queryKey: ["task-files", taskId],
    queryFn: () => get(`/files/?entity_type=task&entity_id=${taskId}`),
    enabled: !!taskId,
    staleTime: 30000,
  });

  const allFiles = [...(serverFiles ?? []), ...localFiles.filter((lf) => !(serverFiles ?? []).some((sf) => sf.id === lf.id))];

  const { data: brief } = useQuery<ShootingBrief | null>({
    queryKey: ["shooting-brief", taskId],
    queryFn: () =>
      (get(`/tasks/${taskId}/shooting-brief`) as Promise<ShootingBrief>).catch(() => null),
    enabled: task?.task_type === "shooting",
    staleTime: 30000,
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => post(`/tasks/${taskId}/comments`, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      setComment("");
      toast.success("Comment added");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const checklistMutation = useMutation({
    mutationFn: ({ itemId, is_done }: { itemId: number; is_done: boolean }) =>
      patch(`/tasks/${taskId}/checklist/${itemId}`, { is_done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task", taskId] }),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const finalLinkMutation = useMutation({
    mutationFn: (link: string | null) => patch(`/tasks/${taskId}`, { final_link: link }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["task", taskId] }); setFinalLinkEdit(false); toast.success("Link saved"); },
    onError: () => toast.error("Failed to save link"),
  });

  const briefMutation = useMutation({
    mutationFn: (body: object) =>
      brief
        ? patch(`/tasks/${taskId}/shooting-brief`, body)
        : post(`/tasks/${taskId}/shooting-brief`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shooting-brief", taskId] });
      setBriefEditMode(false);
      toast.success("Shooting brief saved");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const editMutation = useMutation({
    mutationFn: (body: object) => patch(`/tasks/${taskId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setEditMode(false);
      toast.success("Task updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleSaveEdit = () => {
    const body: Record<string, unknown> = {};
    if (editForm.title.trim()) body.title = editForm.title.trim();
    if (editForm.description !== (task?.description ?? "")) body.description = editForm.description;
    if (editForm.priority) body.priority = editForm.priority;
    if (editForm.assigned_to) body.assigned_to = Number(editForm.assigned_to);
    if (editForm.project_id) body.project_id = Number(editForm.project_id);
    else if (task?.project_id && !editForm.project_id) body.project_id = null;
    if (editForm.due_date) body.due_date = editForm.due_date;
    if (editForm.start_date) body.start_date = editForm.start_date;
    if (editForm.estimated_hours) body.estimated_hours = Number(editForm.estimated_hours);
    if (editForm.task_type) body.task_type = editForm.task_type;
    editMutation.mutate(body);
  };

  const openEditMode = () => {
    if (!task) return;
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to?.toString() ?? "",
      project_id: task.project_id?.toString() ?? "",
      due_date: task.due_date ?? "",
      start_date: task.start_date ?? "",
      estimated_hours: task.estimated_hours?.toString() ?? "",
      task_type: task.task_type ?? "",
    });
    setEditMode(true);
  };

  const statusMutation = useMutation({
    mutationFn: (status: string) => patch(`/tasks/${taskId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Status updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => del(`/files/${attachmentId}`),
    onSuccess: (_, id) => {
      setLocalFiles((prev) => prev.filter((f) => f.id !== id));
      qc.invalidateQueries({ queryKey: ["task-files", taskId] });
      toast.success("Attachment deleted");
    },
    onError: () => toast.error("Failed to delete attachment"),
  });

  // Workflow mutations
  const workflowMutation = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: object }) =>
      post(`/tasks/${taskId}/${action}`, body ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setShowRejectInput(false);
      setRejectNotes("");
      toast.success("Status updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Time entries
  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["time-entries", taskId],
    queryFn: () => get(`/tasks/${taskId}/time-entries`),
    staleTime: 15000,
  });

  const addTimeMutation = useMutation({
    mutationFn: (body: object) => post(`/tasks/${taskId}/time-entries`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["time-entries", taskId] });
      setTimeNotes(""); setManualMinutes(""); setTimerStart(null);
      if (typeof window !== "undefined") localStorage.removeItem(`timer_${taskId}`);
      toast.success("Time logged");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Restore timer state from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(`timer_${taskId}`);
    if (stored) setTimerStart(Number(stored));
  }, [taskId]);

  const handleStartTimer = () => {
    const t = Date.now();
    setTimerStart(t);
    if (typeof window !== "undefined") localStorage.setItem(`timer_${taskId}`, String(t));
  };

  const handleStopTimer = () => {
    const start = timerStart ?? (typeof window !== "undefined" ? Number(localStorage.getItem(`timer_${taskId}`)) || null : null);
    if (!start) return;
    const minutes = Math.round((Date.now() - start) / 60000);
    addTimeMutation.mutate({ duration_minutes: minutes, notes: timeNotes || undefined });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/files/upload?entity_type=task&entity_id=${taskId}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setLocalFiles((prev) => [...prev, data]);
      qc.invalidateQueries({ queryKey: ["task-files", taskId] });
      toast.success("File uploaded");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const assigneeName = (id?: number) => {
    if (id == null) return "—";
    const fromEmp = employees?.find((e) => e.user_id === id || e.id === id);
    if (fromEmp) return fromEmp.full_name;
    const fromNames = employeeNames?.find((e) => e.user_id === id || e.id === id);
    if (fromNames) return fromNames.full_name;
    return `Employee #${id}`;
  };

  const projectName = (id?: number) =>
    projects?.find((p) => p.id === id)?.name ?? `#${id}`;

  const nextStatus = task ? STATUS_FLOW[task.status] : undefined;

  // Workflow action visibility
  const isSuperAdmin = user?.is_superuser;
  const canTL = isSuperAdmin || hasPermission("edit_task") || hasPermission("assign_task");
  const canAM = isSuperAdmin || hasPermission("edit_client") || hasPermission("view_all_clients");

  const isSelfAssigned = task?.assigned_to != null && (task.assigned_to === user?.id || task.assigned_to === user?.employee_id);
  const showSubmitDelivery = task && task.status === "in_progress";
  // TLs/AMs/SuperAdmins can approve their own tasks; self-approval only blocked for normal employees
  const showTLApprove = task && task.status === "waiting_approval" && canTL;
  const showAMActions = task && task.status === "am_review" && canAM;
  const showSendModerator = task && task.status === "am_review" && canAM;
  const showMarkPublished = task && task.status === "moderator_review" && (isSuperAdmin || hasPermission("publish_content"));

  const totalLogged = timeEntries.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);
  const totalLoggedHours = (totalLogged / 60).toFixed(1);

  const isOverdue =
    task?.due_date && task.status !== "done" && task.status !== "cancelled"
      ? new Date(task.due_date) < new Date()
      : false;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <TopBar title="Task Detail" />
        <main className="flex-1 p-3 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-4 animate-pulse">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <TopBar title="Task Detail" />
        <main className="flex-1 p-6 flex items-center justify-center">
          <p className="text-gray-500">Task not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopBar title="Task Detail" />
      <PageTransition>
        <main className="flex-1 p-3 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-5">

            {/* Back + header */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </div>

            {/* Title card */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {task.task_code && (
                      <span className="text-[11px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
                        {task.task_code}
                      </span>
                    )}
                    {task.task_type && (
                      <span className="text-[11px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded font-medium">
                        {TASK_TYPE_LABEL[task.task_type] ?? task.task_type}
                      </span>
                    )}
                    {isOverdue && (
                      <span className="flex items-center gap-1 text-[11px] bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded font-medium">
                        <AlertTriangle className="w-3 h-3" /> Overdue
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                    {task.title}
                  </h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(canTL || isSuperAdmin) && !editMode && (
                    <Button size="sm" variant="outline" onClick={openEditMode} className="gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                  )}
                  <StatusBadge value={task.status} />
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium}`}>
                    {task.priority}
                  </span>
                  {nextStatus && !showSubmitDelivery && !showTLApprove && !showAMActions && !showMarkPublished && (
                    <Button
                      size="sm"
                      variant={task.status === "done" || task.status === "cancelled" ? "outline" : "default"}
                      onClick={() => statusMutation.mutate(nextStatus)}
                      disabled={statusMutation.isPending}
                    >
                      {STATUS_FLOW_LABEL[task.status] ?? `Move to ${nextStatus.replace(/_/g, " ")}`}
                    </Button>
                  )}
                  {showSubmitDelivery && (
                    <Button size="sm" onClick={() => workflowMutation.mutate({ action: "submit-delivery" })} disabled={workflowMutation.isPending}>
                      Submit for Approval
                    </Button>
                  )}
                  {showTLApprove && !showRejectInput && (
                    <>
                      <Button size="sm" onClick={() => workflowMutation.mutate({ action: "approve" })} disabled={workflowMutation.isPending}>
                        Approve (TL)
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowRejectInput(true)}>
                        Reject
                      </Button>
                    </>
                  )}
                  {showAMActions && !showRejectInput && (
                    <>
                      <Button size="sm" onClick={() => workflowMutation.mutate({ action: "send-to-moderator" })} disabled={workflowMutation.isPending}>
                        Send to Moderator
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowRejectInput(true)}>
                        Reject (AM)
                      </Button>
                    </>
                  )}
                  {showMarkPublished && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => workflowMutation.mutate({ action: "mark-published" })} disabled={workflowMutation.isPending}>
                      Mark Published
                    </Button>
                  )}
                </div>
              </div>

              {/* Revision banner */}
              {task.status === "revisions_needed" && task.revision_notes && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium mb-0.5">
                    {task.revision_type === "external" ? "Client revision" : "Internal revision"} requested
                    {(task.revision_count ?? 0) > 0 && ` (Round ${task.revision_count})`}
                  </p>
                  <p>{task.revision_notes}</p>
                </div>
              )}

              {/* Reject input */}
              {showRejectInput && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 space-y-2">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Rejection reason</p>
                  <Textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="Describe what needs to be revised…"
                    className="text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" disabled={!rejectNotes.trim() || workflowMutation.isPending}
                      onClick={() => workflowMutation.mutate({ action: "reject", body: { notes: rejectNotes } })}>
                      Confirm Reject
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowRejectInput(false); setRejectNotes(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Edit form */}
              {editMode && (
                <div className="mt-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Edit Task Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Title *</label>
                      <Input value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Description</label>
                      <Textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} className="text-sm resize-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Assigned to</label>
                      <select className="w-full h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.assigned_to} onChange={(e) => setEditForm(f => ({ ...f, assigned_to: e.target.value }))}>
                        <option value="">Unassigned</option>
                        {(employeeNames ?? []).map((emp) => (
                          <option key={emp.id} value={emp.user_id ?? emp.id}>{emp.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Project</label>
                      <select className="w-full h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.project_id} onChange={(e) => setEditForm(f => ({ ...f, project_id: e.target.value }))}>
                        <option value="">None</option>
                        {(projects ?? []).map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                      <select className="w-full h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.priority} onChange={(e) => setEditForm(f => ({ ...f, priority: e.target.value }))}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Task Type</label>
                      <select className="w-full h-9 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editForm.task_type} onChange={(e) => setEditForm(f => ({ ...f, task_type: e.target.value }))}>
                        <option value="">General</option>
                        <option value="design">Design</option>
                        <option value="video_editing">Video Editing</option>
                        <option value="motion_graphics">Motion Graphics</option>
                        <option value="shooting">Shooting</option>
                        <option value="social_media">Social Media</option>
                        <option value="content_writing">Content Writing</option>
                        <option value="web_development">Web Development</option>
                        <option value="seo">SEO</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                      <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                      <Input type="date" value={editForm.start_date} onChange={(e) => setEditForm(f => ({ ...f, start_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Estimated Hours</label>
                      <Input type="number" min={0} step={0.5} value={editForm.estimated_hours} onChange={(e) => setEditForm(f => ({ ...f, estimated_hours: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSaveEdit} disabled={!editForm.title.trim() || editMutation.isPending}>
                      {editMutation.isPending ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

              {/* Left: description + tabs */}
              <div className="space-y-5">

                {/* Description */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Description</h2>
                  {task.description ? (
                    <p dir="auto" className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                      {task.description}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No description provided.</p>
                  )}
                </div>

                {/* Final Link */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-blue-500" /> Final Delivery Link
                    </h2>
                    {!finalLinkEdit ? (
                      <button
                        onClick={() => { setFinalLinkValue(task.final_link ?? ""); setFinalLinkEdit(true); }}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (finalLinkValue) {
                              try { new URL(finalLinkValue); } catch { toast.error("Please enter a valid URL"); return; }
                            }
                            finalLinkMutation.mutate(finalLinkValue || null);
                          }}
                          disabled={finalLinkMutation.isPending}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setFinalLinkEdit(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {finalLinkEdit ? (
                    <Input
                      value={finalLinkValue}
                      onChange={(e) => setFinalLinkValue(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="text-sm"
                    />
                  ) : task.final_link ? (
                    <a
                      href={task.final_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline truncate max-w-full"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      {task.final_link}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No delivery link yet. Click the edit icon to add one.</p>
                  )}
                </div>

                {/* Shooting Brief (only for shooting tasks) */}
                {task.task_type === "shooting" && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Shooting Brief</h2>
                      {!briefEditMode ? (
                        <button
                          onClick={() => {
                            setBriefForm({
                              what_was_shot: brief?.what_was_shot ?? "",
                              location: brief?.location ?? "",
                              shoot_date: brief?.shoot_date ?? "",
                              crew_present: brief?.crew_present ?? "",
                              what_happened: brief?.what_happened ?? "",
                              raw_footage_notes: brief?.raw_footage_notes ?? "",
                            });
                            setBriefEditMode(true);
                          }}
                          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => briefMutation.mutate(briefForm)}
                            disabled={briefMutation.isPending}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setBriefEditMode(false)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {briefEditMode ? (
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Location</label>
                            <Input value={briefForm.location} onChange={(e) => setBriefForm(f => ({ ...f, location: e.target.value }))} placeholder="Shoot location" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Shoot Date</label>
                            <Input type="date" value={briefForm.shoot_date} onChange={(e) => setBriefForm(f => ({ ...f, shoot_date: e.target.value }))} />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Crew Present</label>
                          <Input value={briefForm.crew_present} onChange={(e) => setBriefForm(f => ({ ...f, crew_present: e.target.value }))} placeholder="Names of crew members" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">What Was Shot</label>
                          <Textarea value={briefForm.what_was_shot} onChange={(e) => setBriefForm(f => ({ ...f, what_was_shot: e.target.value }))} placeholder="Description of what was filmed…" rows={3} className="text-sm resize-none" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">What Happened / Notes</label>
                          <Textarea value={briefForm.what_happened} onChange={(e) => setBriefForm(f => ({ ...f, what_happened: e.target.value }))} placeholder="How the shoot went, issues, deviations…" rows={3} className="text-sm resize-none" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Raw Footage Notes</label>
                          <Textarea value={briefForm.raw_footage_notes} onChange={(e) => setBriefForm(f => ({ ...f, raw_footage_notes: e.target.value }))} placeholder="Notes on footage quality, usable clips…" rows={3} className="text-sm resize-none" />
                        </div>
                      </div>
                    ) : brief ? (
                      <dl className="space-y-3 text-sm">
                        {[
                          { label: "What was shot", value: brief.what_was_shot },
                          { label: "Location", value: brief.location },
                          { label: "Shoot date", value: brief.shoot_date ? fmtDate(brief.shoot_date) : undefined },
                          { label: "Crew present", value: brief.crew_present },
                          { label: "What happened", value: brief.what_happened },
                          { label: "Footage notes", value: brief.raw_footage_notes },
                        ].map(({ label, value }) =>
                          value ? (
                            <div key={label} className="grid grid-cols-[130px_1fr] gap-2">
                              <dt className="text-gray-500 dark:text-gray-400 font-medium">{label}</dt>
                              <dd className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{value}</dd>
                            </div>
                          ) : null
                        )}
                      </dl>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No shooting brief submitted yet. Click the edit icon to add one.</p>
                    )}
                  </div>
                )}

                {/* Tabs: checklist / comments / activity / time */}
                <Tabs defaultValue="comments">
                  <TabsList className="mb-3">
                    {(task.checklists?.length ?? 0) > 0 && (
                      <TabsTrigger value="checklist" className="gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" />
                        Checklist ({task.checklists?.filter((i) => i.is_done).length}/{task.checklists?.length})
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="comments" className="gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Comments {(task.comments?.length ?? 0) > 0 && `(${task.comments.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      Activity
                    </TabsTrigger>
                    <TabsTrigger value="attachments" className="gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" />
                      Files {allFiles.length > 0 && `(${allFiles.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="time" className="gap-1.5">
                      <Timer className="w-3.5 h-3.5" />
                      Time {totalLogged > 0 && `(${totalLoggedHours}h)`}
                    </TabsTrigger>
                  </TabsList>

                  {/* Checklist */}
                  {(task.checklists?.length ?? 0) > 0 && (
                    <TabsContent value="checklist">
                      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-2">
                        {task.checklists.sort((a, b) => a.order - b.order).map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-3 cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              checked={item.is_done}
                              onChange={(e) =>
                                checklistMutation.mutate({ itemId: item.id, is_done: e.target.checked })
                              }
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                            />
                            <span className={`text-sm ${item.is_done ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </TabsContent>
                  )}

                  {/* Comments */}
                  <TabsContent value="comments">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {(task.comments?.length ?? 0) === 0 ? (
                          <div className="p-6 text-center text-sm text-gray-400">
                            No comments yet. Be the first to comment.
                          </div>
                        ) : (
                          task.comments.map((c) => (
                            <div key={c.id} className="p-4">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                                  {c.user_id ? assigneeName(c.user_id).charAt(0).toUpperCase() : "?"}
                                </div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {c.user_id ? assigneeName(c.user_id) : "Unknown"}
                                </span>
                                <span className="text-xs text-gray-400">{fmtDateTime(c.created_at)}</span>
                              </div>
                              <p dir="auto" className="text-sm text-gray-600 dark:text-gray-400 pl-8 whitespace-pre-wrap">
                                {c.content}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      {/* Add comment */}
                      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex gap-2">
                          <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Write a comment…"
                            className="text-sm resize-none min-h-[72px]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && comment.trim()) {
                                commentMutation.mutate(comment.trim());
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            className="self-end shrink-0"
                            disabled={!comment.trim() || commentMutation.isPending}
                            onClick={() => comment.trim() && commentMutation.mutate(comment.trim())}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Ctrl+Enter to submit</p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Activity log */}
                  <TabsContent value="activity">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                      {(task.status_history?.length ?? 0) === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">No status history.</p>
                      ) : (
                        <ol className="relative border-l border-gray-200 dark:border-gray-700 space-y-4 ml-2">
                          {[...task.status_history].reverse().map((h) => (
                            <li key={h.id} className="ml-4">
                              <div className="absolute w-2 h-2 bg-indigo-400 rounded-full -left-1 mt-1.5" />
                              <p className="text-xs text-gray-400 mb-0.5">{fmtDateTime(h.changed_at)}</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {h.from_status ? (
                                  <>
                                    Status changed from{" "}
                                    <span className="font-medium">{h.from_status.replace("_", " ")}</span>
                                    {" → "}
                                  </>
                                ) : "Created as "}
                                <span className="font-medium">{h.to_status.replace("_", " ")}</span>
                              </p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </TabsContent>

                  {/* Attachments */}
                  <TabsContent value="attachments">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Attachments</h3>
                        <label className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                          <Upload className="w-3.5 h-3.5" />
                          {uploading ? "Uploading…" : "Upload"}
                          <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                      </div>
                      {allFiles.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-400">
                          No files attached yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {allFiles.map((att) => {
                            const mediaUrl = att.file_url ? getMediaUrl(att.file_url) : "#";
                            const canPreview = isImage(att.original_name) || isVideo(att.original_name);
                            return (
                              <div key={att.id} className="flex items-center gap-3 p-3">
                                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  {canPreview ? (
                                    <button
                                      onClick={() => setPreviewMedia({ url: mediaUrl, name: att.original_name })}
                                      className="text-sm text-blue-600 hover:underline truncate block text-left w-full"
                                    >
                                      {att.original_name}
                                    </button>
                                  ) : (
                                    <a
                                      href={mediaUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sm text-blue-600 hover:underline truncate block"
                                    >
                                      {att.original_name}
                                    </a>
                                  )}
                                  <p className="text-xs text-gray-400">
                                    {att.size_bytes ? `${(att.size_bytes / 1024).toFixed(1)} KB · ` : ""}
                                    {fmtDate(att.created_at)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => deleteAttachmentMutation.mutate(att.id)}
                                  disabled={deleteAttachmentMutation.isPending}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Time Tracking */}
                  <TabsContent value="time">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                      {/* Summary */}
                      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Time Tracking</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Logged: <span className="font-semibold text-blue-600 dark:text-blue-400">{totalLoggedHours}h</span>
                            {task.estimated_hours && (
                              <> · Estimated: <span className="font-semibold">{task.estimated_hours}h</span></>
                            )}
                          </p>
                        </div>
                        {task.estimated_hours && totalLogged > 0 && (
                          <div className="w-24">
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${totalLogged / 60 > task.estimated_hours ? "bg-red-500" : "bg-blue-500"}`}
                                style={{ width: `${Math.min(100, (totalLogged / 60 / task.estimated_hours) * 100)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 text-right mt-0.5">
                              {Math.round((totalLogged / 60 / task.estimated_hours) * 100)}%
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Timer controls */}
                      <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
                        <div className="flex items-center gap-2">
                          {!timerStart ? (
                            <Button size="sm" variant="outline" onClick={handleStartTimer} className="gap-1.5">
                              <PlayCircle className="w-3.5 h-3.5 text-green-500" /> Start Timer
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={handleStopTimer} disabled={addTimeMutation.isPending} className="gap-1.5">
                              <StopCircle className="w-3.5 h-3.5 text-red-500" /> Stop & Log
                            </Button>
                          )}
                          <span className="text-xs text-gray-400">or log manually:</span>
                          <Input
                            type="number"
                            min={1}
                            placeholder="minutes"
                            className="h-8 w-24 text-xs"
                            value={manualMinutes}
                            onChange={(e) => setManualMinutes(e.target.value)}
                          />
                          <Button size="sm" variant="outline" disabled={!manualMinutes || addTimeMutation.isPending}
                            onClick={() => addTimeMutation.mutate({ duration_minutes: parseInt(manualMinutes), notes: timeNotes || undefined })}
                            className="gap-1">
                            <Plus className="w-3 h-3" /> Log
                          </Button>
                        </div>
                        <Input
                          placeholder="Notes (optional)"
                          className="text-sm h-8"
                          value={timeNotes}
                          onChange={(e) => setTimeNotes(e.target.value)}
                        />
                      </div>

                      {/* Entries list */}
                      {timeEntries.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-400">No time logged yet.</div>
                      ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {timeEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between p-3">
                              <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  <Clock className="w-3 h-3 inline mr-1 text-blue-400" />
                                  {entry.duration_minutes} min
                                </p>
                                {entry.notes && <p className="text-xs text-gray-400 mt-0.5">{entry.notes}</p>}
                              </div>
                              <p className="text-xs text-gray-400">{fmtDate(entry.created_at)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right: metadata sidebar */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm space-y-4">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Details</h2>

                  <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Assigned to">
                    {task.assigned_to ? assigneeName(task.assigned_to) : <span className="text-gray-400">Unassigned</span>}
                  </MetaRow>

                  <MetaRow icon={<User className="w-3.5 h-3.5 opacity-50" />} label="Assigned by">
                    {task.assigned_by ? assigneeName(task.assigned_by) : "—"}
                  </MetaRow>

                  {task.project_id && (
                    <MetaRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Project">
                      {projectName(task.project_id)}
                    </MetaRow>
                  )}

                  <MetaRow icon={<Calendar className="w-3.5 h-3.5" />} label="Due date">
                    <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                      {fmtDate(task.due_date)}
                    </span>
                  </MetaRow>

                  {task.start_date && (
                    <MetaRow icon={<Calendar className="w-3.5 h-3.5 opacity-50" />} label="Start date">
                      {fmtDate(task.start_date)}
                    </MetaRow>
                  )}

                  {task.estimated_hours != null && (
                    <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Estimated">
                      {task.estimated_hours}h
                    </MetaRow>
                  )}

                  {task.task_type && (
                    <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Type">
                      {TASK_TYPE_LABEL[task.task_type] ?? task.task_type}
                    </MetaRow>
                  )}

                  {(task.revision_count ?? 0) > 0 && (
                    <MetaRow icon={<History className="w-3.5 h-3.5" />} label="Revisions">
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {task.revision_count} round{(task.revision_count ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </MetaRow>
                  )}

                  {task.created_at && (
                    <MetaRow icon={<Clock className="w-3.5 h-3.5 opacity-40" />} label="Created">
                      {fmtDate(task.created_at)}
                    </MetaRow>
                  )}
                </div>

                {/* Team info */}
                {(task.team_leader_name || task.account_manager_name) && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm space-y-3">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Team</h2>
                    {task.team_leader_name && (
                      <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Team lead">
                        {task.team_leader_name}
                      </MetaRow>
                    )}
                    {task.account_manager_name && (
                      <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Acct. manager">
                        {task.account_manager_name}
                      </MetaRow>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </PageTransition>
      {previewMedia && (
        <MediaPreviewModal
          url={previewMedia.url}
          name={previewMedia.name}
          onClose={() => setPreviewMedia(null)}
        />
      )}
    </div>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">{children}</p>
      </div>
    </div>
  );
}
