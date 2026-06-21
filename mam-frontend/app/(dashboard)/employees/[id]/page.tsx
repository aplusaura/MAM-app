"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch, post, put, del, api, getErrorMessage, getMediaUrl } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Phone, Calendar, Briefcase, Clock, Users, Key, Copy, Pencil, Camera, X, Check, Mail, ShieldCheck, ShieldX, Shield, Gift, DollarSign, Trash2, Star, TrendingUp, BarChart2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";
import { useState, useRef } from "react";
import type { Task, Department, Role, LeaveRequest, EmployeeEvaluation } from "@/types";
import { PageTransition } from "@/components/shared/PageTransition";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

interface DirectReport {
  id: number;
  full_name: string;
  job_title?: string;
  status: string;
  availability_status: string;
}

interface EmployeeDetail {
  id: number;
  user_id?: number;
  full_name: string;
  job_title?: string;
  phone?: string;
  employment_type?: string;
  salary?: number;
  join_date?: string;
  skills?: string[];
  status: string;
  availability_status: string;
  notes?: string;
  department_id?: number;
  role_id?: number;
  manager_id?: number;
  profile_image_url?: string | null;
  role?: Role;
  department?: Department;
  direct_reports?: DirectReport[];
  created_at: string;
}

interface WorkdaysData {
  dates: string[];
  total_days: number;
}

interface WorkSession {
  id: number;
  employee_id: number;
  date: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
}

interface Permission {
  id: number;
  name: string;
  slug: string;
  module: string;
  description?: string;
}

interface UserPermissionOverride {
  id: number;
  user_id: number;
  permission_id: number;
  granted: boolean;
}

interface CredentialsData {
  email: string;
}

interface EditForm {
  full_name: string;
  job_title: string;
  phone: string;
  employment_type: string;
  salary: string;
  join_date: string;
  status: string;
  availability_status: string;
  skills: string;
  notes: string;
}

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const empId = parseInt(id);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.is_superuser ?? false;
  const canEdit = isSuperAdmin || user?.employee_id === empId;

  const [editMode, setEditMode] = useState(false);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "employment" | "skills" | "tasks" | "notes" | "report" | "permissions" | "leaves" | "kpis" | "reviews">("info");
  const [reportPeriod, setReportPeriod] = useState<"3" | "6" | "12" | "all">("6");
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: "", job_title: "", phone: "", employment_type: "",
    salary: "", join_date: "", status: "", availability_status: "",
    skills: "", notes: "",
  });
  const [photoHover, setPhotoHover] = useState(false);
  const [bonusForm, setBonusForm] = useState({ amount: "", reason: "" });
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type: "vacation", start_date: "", end_date: "", reason: "" });
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [evalForm, setEvalForm] = useState({ score: "3", notes: "", evaluation_type: "TL" });
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ score: 3, notes: "", evaluation_type: "monthly", period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [confirmResetPassword, setConfirmResetPassword] = useState(false);
  const [editSession, setEditSession] = useState<{ id: number; hours: string } | null>(null);
  const [editLeave, setEditLeave] = useState<{ id: number; leave_type: string; start_date: string; end_date: string; reason: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: employee, isLoading } = useQuery<EmployeeDetail>({
    queryKey: ["employees", id],
    queryFn: () => get(`/employees/${id}`),
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => get("/tasks/"),
  });

  const { data: workdays } = useQuery<WorkdaysData>({
    queryKey: ["employees", id, "workdays"],
    queryFn: () => get(`/employees/${id}/workdays`),
  });

  const { data: credentials } = useQuery<CredentialsData>({
    queryKey: ["employees", id, "credentials"],
    queryFn: () => get(`/employees/${id}/credentials`),
    enabled: isSuperAdmin,
  });

  const { data: bonuses, refetch: refetchBonuses } = useQuery<{ id: number; amount: number; reason?: string; created_at: string }[]>({
    queryKey: ["employees", id, "bonuses"],
    queryFn: () => get(`/employees/${id}/bonuses`),
    enabled: isSuperAdmin,
  });

  const { data: leaveRequests, refetch: refetchLeaves } = useQuery<LeaveRequest[]>({
    queryKey: ["employees", id, "leave-requests"],
    queryFn: () => get(`/employees/${id}/leave-requests`),
    enabled: isSuperAdmin || user?.employee_id === empId,
  });

  const { data: evaluations, refetch: refetchEvals } = useQuery<EmployeeEvaluation[]>({
    queryKey: ["employees", id, "evaluations"],
    queryFn: () => get(`/employees/${id}/evaluations`),
    enabled: isSuperAdmin,
  });

  const { data: kpis } = useQuery<{ tasks_done: number; total_tasks: number; avg_completion_rate: number; overdue_rate: number; overdue_count: number; avg_score: number | null; avg_actual_hours: number | null }>({
    queryKey: ["employees", id, "kpis"],
    queryFn: () => get(`/employees/${id}/kpis`),
    enabled: isSuperAdmin || user?.employee_id === empId,
  });

  const giveBonusMutation = useMutation({
    mutationFn: (data: { amount: number; reason?: string }) =>
      post(`/employees/${empId}/bonuses`, data),
    onSuccess: () => {
      toast.success("Bonus given! Employee has been notified.");
      refetchBonuses();
      setBonusForm({ amount: "", reason: "" });
      setShowBonusForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const leaveRequestMutation = useMutation({
    mutationFn: (data: object) => post(`/employees/${empId}/leave-requests`, data),
    onSuccess: () => {
      toast.success("Leave request submitted");
      refetchLeaves();
      setLeaveForm({ leave_type: "vacation", start_date: "", end_date: "", reason: "" });
      setShowLeaveForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const reviewLeaveMutation = useMutation({
    mutationFn: ({ leaveId, status }: { leaveId: number; status: string }) =>
      patch(`/employees/leave-requests/${leaveId}`, { status }),
    onSuccess: () => { refetchLeaves(); toast.success("Leave request updated"); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const addEvalMutation = useMutation({
    mutationFn: (data: object) => post(`/employees/${empId}/evaluations`, data),
    onSuccess: () => {
      toast.success("Evaluation saved");
      refetchEvals();
      setEvalForm({ score: "3", notes: "", evaluation_type: "TL" });
      setShowEvalForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const addReviewMutation = useMutation({
    mutationFn: (data: object) => post(`/employees/${empId}/evaluations`, data),
    onSuccess: () => {
      toast.success("Review saved");
      refetchEvals();
      setReviewForm({ score: 3, notes: "", evaluation_type: "monthly", period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() });
      setShowReviewForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { data: monthlyApiReport } = useQuery<{ total_tasks: number; completed: number; delayed: number; by_type: Record<string, number> } | null>({
    queryKey: ["reports", "employee", id, "monthly", new Date().getMonth() + 1, new Date().getFullYear()],
    queryFn: () => get(`/reports/employee/${empId}/monthly?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`),
    enabled: isSuperAdmin || user?.employee_id === empId,
  });

  const { data: workSessions, refetch: refetchSessions } = useQuery<WorkSession[]>({
    queryKey: ["employees", id, "work-sessions"],
    queryFn: () => get(`/employees/${empId}/work-sessions`),
    enabled: isSuperAdmin || user?.employee_id === empId,
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ sessionId, total_hours }: { sessionId: number; total_hours: number }) =>
      patch(`/employees/work-sessions/${sessionId}`, { total_hours }),
    onSuccess: () => { refetchSessions(); setEditSession(null); toast.success("Session updated"); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: number) => del(`/employees/work-sessions/${sessionId}`),
    onSuccess: () => { refetchSessions(); toast.success("Session deleted"); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateLeaveMutation = useMutation({
    mutationFn: ({ leaveId, data }: { leaveId: number; data: object }) =>
      put(`/employees/leave-requests/${leaveId}`, data),
    onSuccess: () => { refetchLeaves(); setEditLeave(null); toast.success("Leave request updated"); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: (leaveId: number) => del(`/employees/leave-requests/${leaveId}`),
    onSuccess: () => { refetchLeaves(); toast.success("Leave deleted"); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const { data: allPermissions } = useQuery<Permission[]>({
    queryKey: ["permissions"],
    queryFn: () => get("/permissions/"),
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userOverrides, refetch: refetchOverrides } = useQuery<UserPermissionOverride[]>({
    queryKey: ["users", employee?.user_id, "permissions"],
    queryFn: () => get(`/users/${employee!.user_id}/permissions`),
    enabled: isSuperAdmin && !!employee?.user_id,
  });

  const setPermissionMutation = useMutation({
    mutationFn: ({ permission_id, granted }: { permission_id: number; granted: boolean }) =>
      post(`/users/${employee!.user_id}/permissions`, { user_id: employee!.user_id, permission_id, granted }),
    onSuccess: () => { refetchOverrides(); toast.success("Permission updated"); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const removePermissionMutation = useMutation({
    mutationFn: (override_id: number) =>
      del(`/users/${employee!.user_id}/permissions/${override_id}`),
    onSuccess: () => { refetchOverrides(); toast.success("Permission reset to default"); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<EditForm> & { skills?: string[] }) =>
      patch(`/employees/${empId}`, data),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["employees", id] });
      setEditMode(false);
      setEditSection(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const photoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post(`/employees/${empId}/upload-photo`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Photo updated");
      queryClient.invalidateQueries({ queryKey: ["employees", id] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => post(`/employees/${empId}/reset-password`, {}),
    onSuccess: (data: unknown) => {
      const newPass = (data as { new_password: string }).new_password;
      toast.success(`New password: ${newPass}`, { duration: 15000 });
    },
    onError: () => toast.error("Failed to reset password"),
  });

  const assignedUserId = employee?.user_id ?? null;
  const empTasks = (tasks ?? []).filter((t) => assignedUserId ? t.assigned_to === assignedUserId : false);
  const openTasks = empTasks.filter((t) => !["done", "cancelled"].includes(t.status));
  const doneTasks = empTasks.filter((t) => t.status === "done");
  const inProgressTasks = empTasks.filter((t) => t.status === "in_progress");
  const overdueTasks = empTasks.filter((t) => {
    if (!t.due_date || ["done", "cancelled"].includes(t.status)) return false;
    return new Date(t.due_date) < new Date();
  });

  // This month stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const thisMonthTasks = empTasks.filter((t) => {
    const d = new Date(t.due_date ?? t.created_at ?? "");
    return d >= monthStart && d <= monthEnd;
  });
  const thisMonthOpen = thisMonthTasks.filter((t) => !["done", "cancelled"].includes(t.status)).length;
  const thisMonthInProgress = thisMonthTasks.filter((t) => t.status === "in_progress").length;
  const thisMonthDone = thisMonthTasks.filter((t) => t.status === "done").length;
  const thisMonthOverdue = thisMonthTasks.filter((t) => {
    if (!t.due_date || ["done", "cancelled"].includes(t.status)) return false;
    return new Date(t.due_date) < now;
  }).length;

  // Monthly report: group all tasks by month since join_date (or earliest task / 12 months ago as fallback)
  const monthlyReport = (() => {
    if (!employee) return [];
    let start: Date;
    if (employee.join_date) {
      start = new Date(employee.join_date);
    } else {
      const fallback = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      const earliest = empTasks.reduce<Date | null>((min, t) => {
        const d = new Date(t.created_at ?? t.due_date ?? "");
        return !isNaN(d.getTime()) && (!min || d < min) ? d : min;
      }, null);
      start = earliest && earliest < fallback ? new Date(earliest.getFullYear(), earliest.getMonth(), 1) : fallback;
    }
    const months: { label: string; year: number; month: number }[] = [];
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d <= now) {
      months.push({ label: format(d, "MMM yyyy"), year: d.getFullYear(), month: d.getMonth() });
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return months.reverse().map(({ label, year, month }) => {
      const mStart = new Date(year, month, 1);
      const mEnd = new Date(year, month + 1, 0);
      const mTasks = empTasks.filter((t) => {
        const ref = t.due_date ?? t.created_at;
        if (!ref) return false;
        const d2 = new Date(ref);
        return d2 >= mStart && d2 <= mEnd;
      });
      return {
        label,
        total: mTasks.length,
        done: mTasks.filter((t) => t.status === "done").length,
        inProgress: mTasks.filter((t) => t.status === "in_progress").length,
        overdue: mTasks.filter((t) => {
          if (!t.due_date || ["done", "cancelled"].includes(t.status)) return false;
          return new Date(t.due_date) < new Date(year, month + 1, 0);
        }).length,
      };
    });
  })();

  const getDifficultyColor = (hours: number | undefined): string => {
    if (!hours) return "text-gray-400";
    if (hours <= 2) return "text-green-600";
    if (hours <= 4) return "text-yellow-600";
    if (hours <= 8) return "text-orange-600";
    return "text-red-600";
  };

  const getDifficulty = (hours: number | undefined): string => {
    if (!hours) return "—";
    if (hours <= 2) return "Easy";
    if (hours <= 4) return "Medium";
    if (hours <= 8) return "Hard";
    return "Very Hard";
  };

  const startEditSection = (section: string) => {
    if (!employee) return;
    setEditForm({
      full_name: employee.full_name ?? "",
      job_title: employee.job_title ?? "",
      phone: employee.phone ?? "",
      employment_type: employee.employment_type ?? "",
      salary: employee.salary ? String(employee.salary) : "",
      join_date: employee.join_date ?? "",
      status: employee.status ?? "",
      availability_status: employee.availability_status ?? "",
      skills: (employee.skills ?? []).join(", "),
      notes: employee.notes ?? "",
    });
    setEditSection(section);
  };

  const handleEditClick = () => {
    if (!employee) return;
    setEditForm({
      full_name: employee.full_name ?? "",
      job_title: employee.job_title ?? "",
      phone: employee.phone ?? "",
      employment_type: employee.employment_type ?? "",
      salary: employee.salary ? String(employee.salary) : "",
      join_date: employee.join_date ?? "",
      status: employee.status ?? "",
      availability_status: employee.availability_status ?? "",
      skills: (employee.skills ?? []).join(", "),
      notes: employee.notes ?? "",
    });
    setEditMode(true);
  };

  const handleSave = () => {
    const payload: Record<string, unknown> = {
      full_name: editForm.full_name || undefined,
      job_title: editForm.job_title || undefined,
      phone: editForm.phone || undefined,
      employment_type: editForm.employment_type || undefined,
      salary: editForm.salary ? parseFloat(editForm.salary) : undefined,
      join_date: editForm.join_date || undefined,
      status: editForm.status || undefined,
      availability_status: editForm.availability_status || undefined,
      skills: editForm.skills ? editForm.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      notes: editForm.notes || undefined,
    };
    updateMutation.mutate(payload as Parameters<typeof updateMutation.mutate>[0]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) photoMutation.mutate(file);
  };

  const initials = employee
    ? employee.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "";

  if (isLoading) return (
    <>
      <TopBar title="Employee Profile" />
      <main className="flex-1 p-3 sm:p-6"><p className="text-muted-foreground">Loading...</p></main>
    </>
  );

  if (!employee) return (
    <>
      <TopBar title="Employee Profile" />
      <main className="flex-1 p-3 sm:p-6"><p className="text-muted-foreground">Employee not found.</p></main>
    </>
  );

  const SectionHeader = ({ title, section }: { title: string; section: string }) => (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{title}</h3>
      {canEdit && editSection !== section && (
        <button onClick={() => startEditSection(section)} className="text-gray-400 hover:text-gray-700 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {editSection === section && (
        <div className="flex gap-1.5">
          <button onClick={handleSave} disabled={updateMutation.isPending} className="text-blue-600 hover:text-blue-800 transition-colors">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={() => setEditSection(null)} className="text-gray-400 hover:text-red-500 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: "info", label: "Personal Info" },
    { id: "employment", label: "Employment" },
    { id: "skills", label: "Skills" },
    { id: "tasks", label: `Tasks (${empTasks.length})` },
    { id: "leaves", label: `Leaves${leaveRequests?.length ? ` (${leaveRequests.length})` : ""}` },
    { id: "kpis", label: "KPIs" },
    { id: "reviews", label: `Reviews${evaluations?.length ? ` (${evaluations.length})` : ""}` },
    { id: "notes", label: "Notes" },
    { id: "report", label: "Report" },
    ...(isSuperAdmin ? [{ id: "permissions" as const, label: "Permissions" }] : []),
  ];

  return (
    <>
      <TopBar title={employee.full_name} />
      <main className="flex-1 p-3 sm:p-6 bg-gray-50 min-h-full">
        <PageTransition>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          {/* ── LEFT PANEL ── */}
          <div className="lg:sticky lg:top-4 space-y-4">
            <div className="rounded-xl border border-gray-100 shadow-sm bg-white p-6 flex flex-col items-center text-center">
              {/* Avatar */}
              <div
                className="relative h-24 w-24 rounded-full overflow-hidden cursor-pointer ring-4 ring-gray-100 shadow mb-4"
                onMouseEnter={() => setPhotoHover(true)}
                onMouseLeave={() => setPhotoHover(false)}
                onClick={() => canEdit && fileInputRef.current?.click()}
              >
                {employee.profile_image_url ? (
                  <img
                    src={employee.profile_image_url.startsWith("http") ? employee.profile_image_url : getMediaUrl(employee.profile_image_url)}
                    alt={employee.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-blue-100 text-blue-700 flex items-center justify-center text-3xl font-bold">{initials}</div>
                )}
                {canEdit && photoHover && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

              <h2 className="text-lg font-bold text-gray-900">{employee.full_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{employee.job_title ?? "No title"}</p>

              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                <StatusBadge value={employee.status} />
                <StatusBadge value={employee.availability_status} />
              </div>

              {/* Contact */}
              <div className="w-full mt-5 space-y-2.5 text-left">
                {employee.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                {credentials?.email && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{credentials.email}</span>
                  </div>
                )}
                {employee.join_date && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span>Joined {format(new Date(employee.join_date), "MMM d, yyyy")}</span>
                  </div>
                )}
                {employee.department && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span>{employee.department.name}</span>
                  </div>
                )}
                {employee.role && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Briefcase className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span>{employee.role.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Task stats — this month */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">This Month</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Open", value: thisMonthOpen, color: "text-gray-700" },
                  { label: "In Prog.", value: thisMonthInProgress, color: "text-blue-600" },
                  { label: "Done", value: thisMonthDone, color: "text-emerald-600" },
                  { label: "Overdue", value: thisMonthOverdue, color: "text-red-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg border border-gray-100 shadow-sm bg-white p-2 text-center">
                    <p className={`text-lg font-bold ${color}`}>{value}</p>
                    <p className="text-[9px] font-medium text-gray-400 mt-0.5 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="space-y-0">
            {/* Tab nav */}
            <div className="flex gap-0 border-b border-gray-200 mb-5 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Personal Info tab */}
            {activeTab === "info" && (
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardContent className="p-6">
                  <SectionHeader title="Personal Info" section="info" />
                  {editSection === "info" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                        <Input value={editForm.full_name} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                      <div><label className="text-xs text-muted-foreground mb-1 block">Job Title</label>
                        <Input value={editForm.job_title} onChange={(e) => setEditForm(f => ({ ...f, job_title: e.target.value }))} /></div>
                      <div><label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                        <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
                      <div><label className="text-xs text-muted-foreground mb-1 block">Status</label>
                        <Select value={editForm.status} onValueChange={(v) => setEditForm(f => ({ ...f, status: v ?? "" }))}>
                          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="on_leave">On Leave</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><label className="text-xs text-muted-foreground mb-1 block">Availability</label>
                        <Select value={editForm.availability_status} onValueChange={(v) => setEditForm(f => ({ ...f, availability_status: v ?? "" }))}>
                          <SelectTrigger><SelectValue placeholder="Select availability" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="busy">Busy</SelectItem>
                            <SelectItem value="overloaded">Overloaded</SelectItem>
                            <SelectItem value="on_leave">On Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <div><p className="text-xs text-gray-400 mb-0.5">Full Name</p><p className="font-medium text-gray-800">{employee.full_name}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Job Title</p><p className="font-medium text-gray-800">{employee.job_title ?? "—"}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Phone</p><p className="font-medium text-gray-800">{employee.phone ?? "—"}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Status</p><StatusBadge value={employee.status} /></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Availability</p><StatusBadge value={employee.availability_status} /></div>
                        {employee.department && <div><p className="text-xs text-gray-400 mb-0.5">Department</p><p className="font-medium text-gray-800">{employee.department.name}</p></div>}
                        {employee.role && <div><p className="text-xs text-gray-400 mb-0.5">Role</p><p className="font-medium text-gray-800">{employee.role.name}</p></div>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Employment tab */}
            {activeTab === "employment" && (
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardContent className="p-6">
                  <SectionHeader title="Employment" section="employment" />
                  {editSection === "employment" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="text-xs text-muted-foreground mb-1 block">Employment Type</label>
                        <Select value={editForm.employment_type} onValueChange={(v) => setEditForm(f => ({ ...f, employment_type: v ?? "" }))}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_time">Full Time</SelectItem>
                            <SelectItem value="part_time">Part Time</SelectItem>
                            <SelectItem value="freelancer">Freelancer</SelectItem>
                            <SelectItem value="contractor">Contractor</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><label className="text-xs text-muted-foreground mb-1 block">Salary (monthly)</label>
                        <Input type="number" value={editForm.salary} onChange={(e) => setEditForm(f => ({ ...f, salary: e.target.value }))} /></div>
                      <div><label className="text-xs text-muted-foreground mb-1 block">Join Date</label>
                        <Input type="date" value={editForm.join_date} onChange={(e) => setEditForm(f => ({ ...f, join_date: e.target.value }))} /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      <div><p className="text-xs text-gray-400 mb-0.5">Employment Type</p><p className="font-medium text-gray-800">{employee.employment_type?.replace(/_/g, " ") ?? "—"}</p></div>
                      <div><p className="text-xs text-gray-400 mb-0.5">Monthly Salary</p><p className="font-medium text-gray-800">{employee.salary ? `$${Number(employee.salary).toLocaleString()}` : "—"}</p></div>
                      <div><p className="text-xs text-gray-400 mb-0.5">Join Date</p><p className="font-medium text-gray-800">{employee.join_date ? format(new Date(employee.join_date), "MMM d, yyyy") : "—"}</p></div>
                      <div><p className="text-xs text-gray-400 mb-0.5">Working Days</p><p className="font-medium text-gray-800">{workdays?.total_days ?? 0}</p></div>
                    </div>
                  )}

                  {/* Credentials (admin only) */}
                  {isSuperAdmin && credentials && (
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-amber-500" /> Credentials
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <Input value={credentials.email} readOnly className="text-sm font-mono h-8" />
                        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(credentials.email); toast.success("Copied"); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setConfirmResetPassword(true)}>
                        Reset Password
                      </Button>
                    </div>
                  )}

                  {/* Salary Calculation (super admin only) */}
                  {isSuperAdmin && employee.salary && (
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-blue-500" /> Salary This Month
                      </p>
                      {(() => {
                        const baseSalary = Number(employee.salary);
                        const thisMonthBonuses = (bonuses ?? []).filter(b => {
                          const d = new Date(b.created_at);
                          const n = new Date();
                          return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
                        }).reduce((s, b) => s + Number(b.amount), 0);
                        const approvedLeaves = (leaveRequests ?? []).filter(lr => {
                          if (lr.status !== "approved") return false;
                          const d = new Date(lr.start_date);
                          const n = new Date();
                          return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
                        });
                        const leaveDays = approvedLeaves.reduce((s, lr) => s + (lr.days_count ?? 0), 0);
                        const dailyRate = baseSalary / 22;
                        const leaveDeduction = leaveDays * dailyRate;
                        const totalSalary = baseSalary + thisMonthBonuses - leaveDeduction;
                        return (
                          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-700 dark:text-gray-300">
                              <span>Base Salary</span>
                              <span className="font-medium">${baseSalary.toLocaleString()}</span>
                            </div>
                            {thisMonthBonuses > 0 && (
                              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                <span>+ Bonuses</span>
                                <span className="font-medium">+${thisMonthBonuses.toLocaleString()}</span>
                              </div>
                            )}
                            {leaveDeduction > 0 && (
                              <div className="flex justify-between text-red-600 dark:text-red-400">
                                <span>− Leave ({leaveDays}d @ ${dailyRate.toFixed(0)}/d)</span>
                                <span className="font-medium">−${leaveDeduction.toFixed(0)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-200 dark:border-gray-600">
                              <span>Total This Month</span>
                              <span className="text-blue-600 dark:text-blue-400">${totalSalary.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Bonuses (super admin only) */}
                  {isSuperAdmin && (
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Gift className="h-3.5 w-3.5 text-emerald-500" /> Bonuses This Month
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => setShowBonusForm(v => !v)}
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          Give Bonus
                        </Button>
                      </div>

                      {showBonusForm && (
                        <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-100 space-y-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Amount ($)</label>
                            <Input
                              type="number"
                              placeholder="e.g. 500"
                              value={bonusForm.amount}
                              onChange={(e) => setBonusForm(f => ({ ...f, amount: e.target.value }))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Reason</label>
                            <Textarea
                              placeholder="Why are you giving this bonus?"
                              value={bonusForm.reason}
                              onChange={(e) => setBonusForm(f => ({ ...f, reason: e.target.value }))}
                              className="text-sm resize-none h-16"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={!bonusForm.amount || giveBonusMutation.isPending}
                              onClick={() => giveBonusMutation.mutate({ amount: parseFloat(bonusForm.amount), reason: bonusForm.reason || undefined })}
                            >
                              {giveBonusMutation.isPending ? "Saving…" : "Confirm Bonus"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowBonusForm(false)}>Cancel</Button>
                          </div>
                        </div>
                      )}

                      {/* Bonus history */}
                      {bonuses && bonuses.length > 0 ? (
                        <div className="space-y-2">
                          {bonuses.map((b) => (
                            <div key={b.id} className="flex items-start justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                              <div>
                                <p className="text-sm font-semibold text-emerald-700">+${Number(b.amount).toLocaleString()}</p>
                                {b.reason && <p className="text-xs text-gray-500 mt-0.5">{b.reason}</p>}
                              </div>
                              <p className="text-xs text-gray-400 shrink-0 ml-4">{format(new Date(b.created_at), "MMM d, yyyy")}</p>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                              Total bonuses:{" "}
                              <span className="font-semibold text-emerald-600">
                                +${bonuses.filter(b => {
                                  const d = new Date(b.created_at);
                                  const now = new Date();
                                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                                }).reduce((sum, b) => sum + Number(b.amount), 0).toLocaleString()} this month
                              </span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No bonuses given yet.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Skills tab */}
            {activeTab === "skills" && (
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardContent className="p-6">
                  <SectionHeader title="Skills" section="skills" />
                  {editSection === "skills" ? (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Skills (comma-separated)</label>
                      <Input value={editForm.skills} onChange={(e) => setEditForm(f => ({ ...f, skills: e.target.value }))} placeholder="e.g. Video Editing, Premiere Pro" />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {employee.skills?.length ? employee.skills.map((s) => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      )) : <p className="text-sm text-gray-400">No skills listed.</p>}
                    </div>
                  )}

                  {/* Direct Reports */}
                  {(employee.direct_reports ?? []).length > 0 && (
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Team Members</p>
                      <div className="space-y-2">
                        {employee.direct_reports!.map((dr) => (
                          <div key={dr.id} onClick={() => router.push(`/employees/${dr.id}`)}
                            className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors">
                            <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {dr.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{dr.full_name}</p>
                              <p className="text-xs text-muted-foreground">{dr.job_title ?? ""}</p>
                            </div>
                            <StatusBadge value={dr.availability_status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tasks tab */}
            {activeTab === "tasks" && (
              <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {empTasks.length === 0 ? (
                    <p className="text-sm text-gray-400 p-6">No tasks assigned.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Task</th>
                          <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Type</th>
                          <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Deadline</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empTasks.map((t) => (
                          <tr key={t.id} onClick={() => router.push(`/tasks/${t.id}`)} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors cursor-pointer">
                            <td className="px-5 py-3.5 font-medium text-gray-800 hover:text-blue-600">{t.title}</td>
                            <td className="px-5 py-3.5 text-gray-600">{t.task_type?.replace(/_/g, " ") ?? "—"}</td>
                            <td className="px-5 py-3.5"><StatusBadge value={t.status} /></td>
                            <td className="px-5 py-3.5">
                              {t.due_date ? (
                                <span className={new Date(t.due_date) < new Date() && !["done", "cancelled"].includes(t.status) ? "text-red-600 font-medium" : "text-gray-600"}>
                                  {format(new Date(t.due_date), "MMM d, yyyy")}
                                </span>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes tab */}
            {activeTab === "notes" && (
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardContent className="p-6">
                  <SectionHeader title="Notes" section="notes" />
                  {editSection === "notes" ? (
                    <Textarea value={editForm.notes} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={6} />
                  ) : (
                    <p dir="auto" className="text-sm text-gray-700 whitespace-pre-wrap">{employee.notes ?? "No notes."}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Report tab */}
            {activeTab === "report" && (
              <Card className="rounded-xl border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Monthly Performance Report</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {employee.join_date ? `Since ${format(new Date(employee.join_date), "MMM yyyy")}` : "All time"}
                      </p>
                    </div>
                    <select
                      value={reportPeriod}
                      onChange={(e) => setReportPeriod(e.target.value as "3" | "6" | "12" | "all")}
                      className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="3">Last 3 months</option>
                      <option value="6">Last 6 months</option>
                      <option value="12">Last 12 months</option>
                      <option value="all">All time</option>
                    </select>
                  </div>
                  {monthlyReport.length === 0 ? (
                    <p className="text-sm text-gray-400 p-6">No report data available.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                          <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Month</th>
                          <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Total</th>
                          <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Done</th>
                          <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-widest">In Progress</th>
                          <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Overdue</th>
                          <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportPeriod === "all" ? monthlyReport : monthlyReport.slice(0, Number(reportPeriod))).map((row) => {
                          const rate = row.total > 0 ? Math.round((row.done / row.total) * 100) : null;
                          return (
                            <tr key={row.label} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors">
                              <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-100">{row.label}</td>
                              <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{row.total}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{row.done}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-blue-600 dark:text-blue-400">{row.inProgress}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {row.overdue > 0 ? (
                                  <span className="text-red-600 dark:text-red-400 font-medium">{row.overdue}</span>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {rate !== null ? (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rate >= 80 ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : rate >= 50 ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"}`}>
                                    {rate}%
                                  </span>
                                ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}
            {/* Leaves tab */}
            {activeTab === "leaves" && (
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Leave Requests</h3>
                    <Button size="sm" variant="outline" onClick={() => setShowLeaveForm(v => !v)}>
                      + Request Leave
                    </Button>
                  </div>

                  {showLeaveForm && (
                    <div className="mb-5 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Type</label>
                          <Select value={leaveForm.leave_type} onValueChange={(v) => setLeaveForm(f => ({ ...f, leave_type: v ?? "vacation" }))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vacation">Vacation</SelectItem>
                              <SelectItem value="sick">Sick</SelectItem>
                              <SelectItem value="personal">Personal</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div />
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                          <Input type="date" className="h-8 text-sm" value={leaveForm.start_date} onChange={(e) => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                          <Input type="date" className="h-8 text-sm" value={leaveForm.end_date} onChange={(e) => setLeaveForm(f => ({ ...f, end_date: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Reason (optional)</label>
                        <Textarea rows={2} className="text-sm resize-none" value={leaveForm.reason} onChange={(e) => setLeaveForm(f => ({ ...f, reason: e.target.value }))} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={!leaveForm.start_date || !leaveForm.end_date || leaveRequestMutation.isPending}
                          onClick={() => {
                            const start = new Date(leaveForm.start_date);
                            const end = new Date(leaveForm.end_date);
                            const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
                            leaveRequestMutation.mutate({ ...leaveForm, days_count: days, employee_id: empId });
                          }}>
                          Submit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowLeaveForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {!leaveRequests?.length ? (
                    <p className="text-sm text-gray-400">No leave requests yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {leaveRequests.map((lr) => (
                        <div key={lr.id} className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 overflow-hidden">
                          {editLeave?.id === lr.id ? (
                            <div className="p-3 space-y-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Type</label>
                                  <Select value={editLeave.leave_type} onValueChange={(v) => setEditLeave(prev => prev ? { ...prev, leave_type: v as string } : null)}>
                                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="vacation">Vacation</SelectItem>
                                      <SelectItem value="sick">Sick</SelectItem>
                                      <SelectItem value="personal">Personal</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div />
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                                  <Input type="date" className="h-7 text-xs" value={editLeave.start_date} onChange={(e) => setEditLeave(prev => prev ? { ...prev, start_date: e.target.value } : null)} />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                                  <Input type="date" className="h-7 text-xs" value={editLeave.end_date} onChange={(e) => setEditLeave(prev => prev ? { ...prev, end_date: e.target.value } : null)} />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-1 block">Reason</label>
                                <Input className="h-7 text-xs" value={editLeave.reason} onChange={(e) => setEditLeave(prev => prev ? { ...prev, reason: e.target.value } : null)} />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" className="h-6 text-xs" disabled={updateLeaveMutation.isPending}
                                  onClick={() => {
                                    const start = new Date(editLeave.start_date);
                                    const end = new Date(editLeave.end_date);
                                    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
                                    updateLeaveMutation.mutate({ leaveId: lr.id, data: { ...editLeave, days_count: days, employee_id: empId } });
                                  }}>Save</Button>
                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditLeave(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-3">
                              <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 capitalize">{lr.leave_type} leave</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {lr.start_date} → {lr.end_date} · {lr.days_count} day{lr.days_count !== 1 ? "s" : ""}
                                </p>
                                {lr.reason && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lr.reason}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                                  lr.status === "approved" ? "bg-green-100 text-green-700" :
                                  lr.status === "denied" ? "bg-red-100 text-red-700" :
                                  "bg-yellow-100 text-yellow-700"
                                }`}>{lr.status}</span>
                                {isSuperAdmin && lr.status === "pending" && (
                                  <>
                                    <Button size="sm" variant="outline" className="h-6 text-xs border-green-200 text-green-700"
                                      onClick={() => reviewLeaveMutation.mutate({ leaveId: lr.id, status: "approved" })}>
                                      Approve
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-6 text-xs border-red-200 text-red-700"
                                      onClick={() => reviewLeaveMutation.mutate({ leaveId: lr.id, status: "denied" })}>
                                      Deny
                                    </Button>
                                  </>
                                )}
                                {(isSuperAdmin || user?.employee_id === empId) && lr.status === "pending" && (
                                  <>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                                      onClick={() => setEditLeave({ id: lr.id, leave_type: lr.leave_type, start_date: lr.start_date, end_date: lr.end_date, reason: lr.reason ?? "" })}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                      onClick={() => deleteLeaveMutation.mutate(lr.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* KPIs tab */}
            {activeTab === "kpis" && (
              <div className="space-y-4">
                {/* KPI summary cards */}
                {(() => {
                  const totalTasks = kpis?.total_tasks ?? 0;
                  const tasksDone = kpis?.tasks_done ?? 0;
                  const overdueCount = kpis?.overdue_count ?? 0;
                  const completionRate = totalTasks > 0
                    ? Math.round((kpis?.avg_completion_rate ?? tasksDone / totalTasks) * 100)
                    : 0;
                  const onTimeRate = totalTasks > 0
                    ? Math.max(0, Math.round(((totalTasks - overdueCount) / totalTasks) * 100))
                    : 100;
                  const evalAvg = evaluations && evaluations.length > 0
                    ? (evaluations.reduce((s, ev) => s + ev.score, 0) / evaluations.length).toFixed(1)
                    : (kpis?.avg_score != null ? kpis.avg_score.toFixed(1) : "—");
                  // Performance score 0-100
                  const taskPts = Math.min(tasksDone / 10, 1) * 30;
                  const completionPts = (completionRate / 100) * 30;
                  const evalScore = kpis?.avg_score ?? (evaluations?.length ? evaluations.reduce((s, ev) => s + ev.score, 0) / evaluations.length : null);
                  const evalPts = evalScore != null ? (evalScore / 5) * 25 : 12.5;
                  const perfScore = Math.round(taskPts + completionPts + evalPts + 15);
                  const perfColor = perfScore >= 80 ? "text-emerald-600 dark:text-emerald-400" : perfScore >= 60 ? "text-blue-600 dark:text-blue-400" : perfScore >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
                  return (
                    <div className="space-y-3">
                      {/* Performance score hero card */}
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm p-5 flex items-center gap-5">
                        <div className="flex flex-col items-center justify-center h-20 w-20 rounded-full border-4 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-inner shrink-0">
                          <span className={`text-2xl font-extrabold ${perfColor}`}>{perfScore}</span>
                          <span className="text-[10px] text-gray-400 font-medium">/100</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Performance Score</p>
                          <p className="text-xs text-gray-500 mt-0.5">Tasks (30) + Completion (30) + Eval (25) + Attendance (15)</p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>Tasks: <b className="text-gray-700 dark:text-gray-300">{Math.min(Math.round(tasksDone / 10 * 100), 100)}%</b></span>
                            <span>Completion: <b className="text-gray-700 dark:text-gray-300">{completionRate}%</b></span>
                            <span>Eval: <b className="text-gray-700 dark:text-gray-300">{evalScore != null ? Math.round(evalScore / 5 * 100) : 50}%</b></span>
                            <span>Attendance: <b className="text-gray-700 dark:text-gray-300">100%</b></span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Tasks Done", value: tasksDone, color: "text-emerald-600 dark:text-emerald-400" },
                          { label: "Completion Rate", value: kpis ? `${completionRate}%` : "—", color: "text-blue-600 dark:text-blue-400" },
                          { label: "On-time Rate", value: kpis ? `${onTimeRate}%` : "—", color: "text-indigo-600 dark:text-indigo-400" },
                          { label: "Avg Score", value: evalAvg, color: "text-amber-600 dark:text-amber-400" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 text-center">
                            <p className={`text-2xl font-bold ${color}`}>{value}</p>
                            <p className="text-xs text-gray-400 mt-1">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Work Log — from DB */}
                {(isSuperAdmin || user?.employee_id === empId) && (
                  <Card className="rounded-xl border-gray-100 dark:border-gray-700 shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Work Log</h3>
                        {workSessions && workSessions.length > 0 && (
                          <span className="text-xs text-gray-400">
                            Total: <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {Math.floor(workSessions.reduce((s, ws) => s + (ws.total_hours ?? 0), 0))}h{" "}
                              {Math.round((workSessions.reduce((s, ws) => s + (ws.total_hours ?? 0), 0) % 1) * 60)}m
                            </span>
                          </span>
                        )}
                      </div>
                      {!workSessions?.length ? (
                        <p className="text-sm text-gray-400">No work sessions recorded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {workSessions.map((ws) => (
                            <div key={ws.id} className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 overflow-hidden">
                              {editSession?.id === ws.id ? (
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <span className="text-sm text-gray-600 shrink-0">{ws.date}</span>
                                  <Input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    max="24"
                                    className="h-7 text-xs w-20"
                                    value={editSession.hours}
                                    onChange={(e) => setEditSession(prev => prev ? { ...prev, hours: e.target.value } : null)}
                                  />
                                  <span className="text-xs text-gray-400">hrs</span>
                                  <Button size="sm" className="h-6 text-xs px-2" disabled={updateSessionMutation.isPending}
                                    onClick={() => updateSessionMutation.mutate({ sessionId: ws.id, total_hours: parseFloat(editSession.hours) })}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditSession(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between px-3 py-2">
                                  <span className="text-sm text-gray-700 dark:text-gray-200">{ws.date}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400 font-mono">
                                      {ws.total_hours != null ? `${Math.floor(ws.total_hours)}h ${Math.round((ws.total_hours % 1) * 60).toString().padStart(2, "0")}m` : "—"}
                                    </span>
                                    {isSuperAdmin && (
                                      <div className="flex gap-1">
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                                          onClick={() => setEditSession({ id: ws.id, hours: String(ws.total_hours ?? 0) })}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                                          onClick={() => deleteSessionMutation.mutate(ws.id)}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Evaluations */}
                <Card className="rounded-xl border-gray-100 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Evaluations</h3>
                      {isSuperAdmin && (
                        <Button size="sm" variant="outline" onClick={() => setShowEvalForm(v => !v)}>
                          + Add Evaluation
                        </Button>
                      )}
                    </div>

                    {showEvalForm && (
                      <div className="mb-5 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Type</label>
                            <Select value={evalForm.evaluation_type} onValueChange={(v) => setEvalForm(f => ({ ...f, evaluation_type: v ?? "TL" }))}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TL">Team Leader</SelectItem>
                                <SelectItem value="AM">Account Manager</SelectItem>
                                <SelectItem value="CEO">CEO</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Score (1–5)</label>
                            <Select value={evalForm.score} onValueChange={(v) => setEvalForm(f => ({ ...f, score: v ?? "3" }))}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <SelectItem key={n} value={String(n)}>{n} — {["Poor", "Fair", "Good", "Very Good", "Excellent"][n - 1]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                          <Textarea rows={2} className="text-sm resize-none" value={evalForm.notes} onChange={(e) => setEvalForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" disabled={addEvalMutation.isPending}
                            onClick={() => addEvalMutation.mutate({
                              score: parseInt(evalForm.score),
                              notes: evalForm.notes || undefined,
                              evaluation_type: evalForm.evaluation_type,
                              period_month: new Date().getMonth() + 1,
                              period_year: new Date().getFullYear(),
                            })}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowEvalForm(false)}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {!evaluations?.length ? (
                      <p className="text-sm text-gray-400">No evaluations yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {evaluations.map((ev) => (
                          <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${ev.score >= 4 ? "text-emerald-600" : ev.score === 3 ? "text-blue-600" : "text-red-600"}`}>
                                  {ev.score}/5
                                </span>
                                <span className="text-xs text-gray-400 capitalize">{ev.evaluation_type} review</span>
                              </div>
                              {ev.notes && <p className="text-xs text-gray-500 mt-0.5">{ev.notes}</p>}
                            </div>
                            <p className="text-xs text-gray-400 shrink-0 ml-4">
                              {new Date(ev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Performance Reviews tab */}
            {activeTab === "reviews" && (
              <div className="space-y-5">

                {/* Report card — this month */}
                {(() => {
                  const totalTasks = monthlyApiReport?.total_tasks ?? thisMonthTasks.length;
                  const completed = monthlyApiReport?.completed ?? thisMonthDone;
                  const delayed = monthlyApiReport?.delayed ?? thisMonthOverdue;
                  const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
                  const avgHrs = kpis?.avg_actual_hours ?? null;
                  const latestEval = evaluations?.[0] ?? null;

                  return (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center gap-3">
                        <div className="p-1.5 bg-white/20 rounded-lg">
                          <BarChart2 className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">Monthly Report Card</h3>
                          <p className="text-xs text-blue-100">{format(new Date(), "MMMM yyyy")}</p>
                        </div>
                      </div>
                      <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalTasks}</p>
                          <p className="text-xs text-gray-400 mt-1">Tasks Assigned</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completed}</p>
                          <p className="text-xs text-gray-400 mt-1">Completed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-500 dark:text-red-400">{delayed}</p>
                          <p className="text-xs text-gray-400 mt-1">Overdue</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-2xl font-bold ${completionRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : completionRate >= 50 ? "text-amber-500" : "text-red-500"}`}>
                            {completionRate}%
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Completion Rate</p>
                        </div>
                      </div>
                      {(avgHrs !== null || latestEval !== null) && (
                        <div className="px-6 pb-5 flex flex-wrap gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                          {avgHrs !== null && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <Clock className="h-4 w-4 text-blue-400" />
                              <span>Avg task hours: <span className="font-semibold">{avgHrs}h</span></span>
                            </div>
                          )}
                          {latestEval !== null && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                              <span>Latest review: <span className="font-semibold">{latestEval.score}/5</span>
                                <span className="text-gray-400 ml-1">({latestEval.evaluation_type})</span>
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Score trend chart */}
                {evaluations && evaluations.length > 1 && (
                  <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Score Trend</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart
                        data={[...evaluations].reverse().map((ev) => ({
                          label: `${ev.period_month ?? ""}/${ev.period_year ?? ""}`.replace(/^\/|\/$/g, "") || new Date(ev.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
                          score: ev.score,
                          type: ev.evaluation_type,
                        }))}
                        margin={{ top: 4, right: 16, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                        <Tooltip
                          formatter={(value: unknown) => [`${value}/5`, "Score"]}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        />
                        <ReferenceLine y={3} stroke="#d1d5db" strokeDasharray="4 2" label={{ value: "Avg", position: "right", fontSize: 10, fill: "#9ca3af" }} />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={{ fill: "#3b82f6", r: 4, strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Add Review form + list */}
                <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Performance Reviews</h3>
                    {isSuperAdmin && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowReviewForm(v => !v)}>
                        + Add Review
                      </Button>
                    )}
                  </div>

                  {/* Add Review form */}
                  {showReviewForm && isSuperAdmin && (
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 space-y-4">
                      {/* Star rating */}
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block font-medium">Score</label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setReviewForm(f => ({ ...f, score: n }))}
                              className="transition-transform hover:scale-110 focus:outline-none"
                            >
                              <Star
                                className={`h-8 w-8 transition-colors ${n <= reviewForm.score ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-600 fill-gray-200 dark:fill-gray-600"}`}
                              />
                            </button>
                          ))}
                          <span className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {reviewForm.score}/5 — {["Poor", "Fair", "Good", "Very Good", "Excellent"][reviewForm.score - 1]}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {/* Evaluation type */}
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Review Type</label>
                          <select
                            value={reviewForm.evaluation_type}
                            onChange={(e) => setReviewForm(f => ({ ...f, evaluation_type: e.target.value }))}
                            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="project">Project</option>
                            <option value="TL">Team Leader</option>
                            <option value="AM">Account Manager</option>
                            <option value="CEO">CEO</option>
                          </select>
                        </div>
                        {/* Month */}
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Month</label>
                          <select
                            value={reviewForm.period_month}
                            onChange={(e) => setReviewForm(f => ({ ...f, period_month: parseInt(e.target.value) }))}
                            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                              <option key={m} value={i + 1}>{m}</option>
                            ))}
                          </select>
                        </div>
                        {/* Year */}
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Year</label>
                          <select
                            value={reviewForm.period_year}
                            onChange={(e) => setReviewForm(f => ({ ...f, period_year: parseInt(e.target.value) }))}
                            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Notes (optional)</label>
                        <textarea
                          rows={3}
                          value={reviewForm.notes}
                          onChange={(e) => setReviewForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Add performance notes, strengths, areas to improve..."
                          className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={addReviewMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => addReviewMutation.mutate({
                            score: reviewForm.score,
                            notes: reviewForm.notes || undefined,
                            evaluation_type: reviewForm.evaluation_type,
                            period_month: reviewForm.period_month,
                            period_year: reviewForm.period_year,
                          })}
                        >
                          {addReviewMutation.isPending ? "Saving..." : "Submit Review"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowReviewForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Reviews list */}
                  <div className="divide-y divide-gray-50 dark:divide-gray-700/60">
                    {!evaluations?.length ? (
                      <p className="text-sm text-gray-400 p-6">No reviews yet.</p>
                    ) : (
                      evaluations.map((ev) => {
                        const scoreLabel = ["Poor", "Fair", "Good", "Very Good", "Excellent"][ev.score - 1] ?? "";
                        const scoreColor = ev.score >= 4 ? "text-emerald-600 dark:text-emerald-400" : ev.score === 3 ? "text-blue-600 dark:text-blue-400" : "text-red-500 dark:text-red-400";
                        return (
                          <div key={ev.id} className="px-6 py-4 flex items-start gap-4">
                            {/* Stars */}
                            <div className="flex flex-col items-center shrink-0 pt-0.5">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <Star key={n} className={`h-3.5 w-3.5 ${n <= ev.score ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-600 fill-gray-200 dark:fill-gray-600"}`} />
                                ))}
                              </div>
                              <span className={`text-xs font-bold mt-1 ${scoreColor}`}>{ev.score}/5</span>
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 capitalize">{ev.evaluation_type} review</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ev.score >= 4 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : ev.score === 3 ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                                  {scoreLabel}
                                </span>
                                {(ev.period_month && ev.period_year) && (
                                  <span className="text-xs text-gray-400">
                                    {new Date(ev.period_year, ev.period_month - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                  </span>
                                )}
                              </div>
                              {ev.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">{ev.notes}</p>}
                            </div>
                            {/* Date */}
                            <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                              {new Date(ev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Average score summary if reviews exist */}
                {evaluations && evaluations.length > 0 && (
                  <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Score Summary</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-amber-500">
                          {(evaluations.reduce((s, ev) => s + ev.score, 0) / evaluations.length).toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Overall Avg</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {Math.max(...evaluations.map(ev => ev.score))}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Best Score</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                          {evaluations.length}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Total Reviews</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Permissions tab — super admin only */}
            {activeTab === "permissions" && isSuperAdmin && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-600 to-purple-500 px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white/20 rounded-lg">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Permission Overrides</h3>
                        <p className="text-xs text-purple-100">Override role defaults for this employee. &quot;Default&quot; follows their role.</p>
                      </div>
                    </div>
                  </div>

                  {!employee.user_id ? (
                    <p className="text-sm text-gray-400 p-6">This employee has no linked user account.</p>
                  ) : !allPermissions?.length ? (
                    <p className="text-sm text-gray-400 p-6">Loading permissions…</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {Object.entries(
                        (allPermissions ?? []).reduce<Record<string, Permission[]>>((acc, p) => {
                          if (!acc[p.module]) acc[p.module] = [];
                          acc[p.module].push(p);
                          return acc;
                        }, {})
                      ).map(([module, perms]) => (
                        <div key={module} className="px-6 py-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 inline-block" />
                            {module.replace(/_/g, " ")}
                          </p>
                          <div className="space-y-2">
                            {perms.map((perm) => {
                              const override = (userOverrides ?? []).find((o) => o.permission_id === perm.id);
                              const state: "default" | "allow" | "deny" = override
                                ? override.granted ? "allow" : "deny"
                                : "default";

                              return (
                                <div key={perm.id} className="flex items-center justify-between gap-4 py-1.5">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-800">{perm.name}</p>
                                    {perm.description && (
                                      <p className="text-xs text-gray-400 truncate">{perm.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Default button */}
                                    <button
                                      onClick={() => override && removePermissionMutation.mutate(override.id)}
                                      disabled={state === "default" || removePermissionMutation.isPending || setPermissionMutation.isPending}
                                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                        state === "default"
                                          ? "bg-gray-100 text-gray-600 ring-1 ring-gray-300"
                                          : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                      }`}
                                      title="Use role default"
                                    >
                                      <Shield className="h-3 w-3" />
                                      Default
                                    </button>
                                    {/* Allow button */}
                                    <button
                                      onClick={() => setPermissionMutation.mutate({ permission_id: perm.id, granted: true })}
                                      disabled={state === "allow" || removePermissionMutation.isPending || setPermissionMutation.isPending}
                                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                        state === "allow"
                                          ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
                                          : "bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                                      }`}
                                      title="Explicitly allow"
                                    >
                                      <ShieldCheck className="h-3 w-3" />
                                      Allow
                                    </button>
                                    {/* Deny button */}
                                    <button
                                      onClick={() => setPermissionMutation.mutate({ permission_id: perm.id, granted: false })}
                                      disabled={state === "deny" || removePermissionMutation.isPending || setPermissionMutation.isPending}
                                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                        state === "deny"
                                          ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                                          : "bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                      }`}
                                      title="Explicitly deny"
                                    >
                                      <ShieldX className="h-3 w-3" />
                                      Deny
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        </PageTransition>
      </main>

      <ConfirmDialog
        open={confirmResetPassword}
        onOpenChange={setConfirmResetPassword}
        title="Reset Password"
        description={`This will generate a new password for ${employee.full_name} and invalidate their current one. The new password will be shown to you once. Continue?`}
        onConfirm={() => resetPasswordMutation.mutate()}
        loading={resetPasswordMutation.isPending}
      />
    </>
  );
}
