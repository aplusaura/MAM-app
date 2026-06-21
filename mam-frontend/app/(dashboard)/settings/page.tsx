"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { post, get, patch } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { formatDistanceToNow } from "date-fns";
import {
  Building2, Users, Briefcase, DollarSign, Target,
  Pencil, Check, X, Lock, Globe, Phone, Mail, MapPin, Activity, Shield, Bell, CheckCircle2,
} from "lucide-react";
import type { Employee, Client, Project, Invoice, ActivityLog } from "@/types";

interface ChangePasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface AgencyInfo {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  about: string;
}

const AGENCY_STORAGE_KEY = "mam_agency_info";

function loadAgency(): AgencyInfo {
  try {
    const raw = localStorage.getItem(AGENCY_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AgencyInfo;
  } catch { /* ignore */ }
  return { name: "MAM Agency", tagline: "Marketing & Media Production", email: "", phone: "", website: "", address: "", about: "" };
}

function saveAgency(info: AgencyInfo) {
  localStorage.setItem(AGENCY_STORAGE_KEY, JSON.stringify(info));
}

interface EmailNotificationSettings {
  email: string;
  enable_task_overdue: boolean;
  enable_invoice_due: boolean;
  enable_lead_updates: boolean;
  enable_project_updates: boolean;
  enable_weekly_report: boolean;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.is_superuser ?? false;

  const [agencyEdit, setAgencyEdit] = useState(false);
  const [agencyForm, setAgencyForm] = useState<AgencyInfo>(loadAgency);
  const [emailNotifEdit, setEmailNotifEdit] = useState(false);
  const [emailNotifForm, setEmailNotifForm] = useState<EmailNotificationSettings>({
    email: user?.email ?? "",
    enable_task_overdue: true,
    enable_invoice_due: true,
    enable_lead_updates: true,
    enable_project_updates: true,
    enable_weekly_report: true,
  });

  const { data: activityLogs } = useQuery<ActivityLog[]>({
    queryKey: ["activity-logs"],
    queryFn: () => get("/notifications/activity-logs?limit=100"),
    staleTime: 120_000,
  });

  const { data: employees } = useQuery<Employee[]>({ queryKey: ["employees"], queryFn: () => get("/employees/") });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["clients"], queryFn: () => get("/clients/") });
  const { data: projects } = useQuery<Project[]>({ queryKey: ["projects"], queryFn: () => get("/projects/") });
  const { data: invoices } = useQuery<Invoice[]>({ queryKey: ["invoices"], queryFn: () => get("/finance/invoices") });

  const activeEmployees = (employees ?? []).filter((e) => e.status === "active").length;
  const activeClients = (clients ?? []).filter((c) => c.status === "active").length;
  const activeProjects = (projects ?? []).filter((p) => p.status === "active").length;
  const totalRevenue = (invoices ?? []).filter((i) => i.payment_status === "paid").reduce((sum, i) => sum + Number(i.total_amount ?? 0), 0);

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<ChangePasswordForm>();
  const newPwd = watch("new_password");

  const changePasswordMutation = useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) =>
      post("/auth/change-password", body),
    onSuccess: () => { toast.success("Password changed successfully"); reset(); },
    onError: () => toast.error("Failed to change password. Check your current password."),
  });

  const emailNotifMutation = useMutation({
    mutationFn: (body: EmailNotificationSettings) =>
      patch("/notifications/email-settings", body),
    onSuccess: () => { toast.success("Email notification settings saved"); setEmailNotifEdit(false); },
    onError: () => toast.error("Failed to save email settings"),
  });

  const handleAgencySave = () => {
    saveAgency(agencyForm);
    setAgencyEdit(false);
    toast.success("Agency profile saved");
  };

  const agencyInfo = loadAgency();

  const stats = [
    { label: "Active Employees", value: activeEmployees, icon: <Users className="h-5 w-5" />, color: "bg-blue-50 text-blue-600" },
    { label: "Active Clients", value: activeClients, icon: <Building2 className="h-5 w-5" />, color: "bg-emerald-50 text-emerald-600" },
    { label: "Active Projects", value: activeProjects, icon: <Briefcase className="h-5 w-5" />, color: "bg-indigo-50 text-indigo-600" },
    { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: <DollarSign className="h-5 w-5" />, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <>
      <TopBar title="Settings" />
      <main className="flex-1 p-3 sm:p-6 bg-gray-50 min-h-full">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Agency Profile Card — Super Admin only */}
          {isSuperAdmin && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header band */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{agencyInfo.name}</h2>
                    <p className="text-sm text-indigo-100">{agencyInfo.tagline}</p>
                  </div>
                </div>
                {!agencyEdit && (
                  <button onClick={() => { setAgencyForm(loadAgency()); setAgencyEdit(true); }}
                    className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                {agencyEdit && (
                  <div className="flex gap-2">
                    <button onClick={handleAgencySave} className="flex items-center gap-1.5 text-xs text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
                      <Check className="h-3.5 w-3.5" /> Save
                    </button>
                    <button onClick={() => setAgencyEdit(false)} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
              {stats.map(({ label, value, icon, color }) => (
                <div key={label} className="flex items-center gap-3 px-5 py-4">
                  <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* localStorage notice */}
            <div className="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
              Settings are saved locally in this browser. They won&apos;t sync across devices.
            </div>

            {/* Agency info */}
            <div className="p-6">
              {agencyEdit ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Agency Name</Label>
                      <Input value={agencyForm.name} onChange={(e) => setAgencyForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Tagline</Label>
                      <Input value={agencyForm.tagline} onChange={(e) => setAgencyForm(f => ({ ...f, tagline: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Email</Label>
                      <Input type="email" value={agencyForm.email} onChange={(e) => setAgencyForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Phone</Label>
                      <Input value={agencyForm.phone} onChange={(e) => setAgencyForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Website</Label>
                      <Input value={agencyForm.website} onChange={(e) => setAgencyForm(f => ({ ...f, website: e.target.value }))} className="mt-1" placeholder="https://..." />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Address</Label>
                      <Input value={agencyForm.address} onChange={(e) => setAgencyForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-500">About the Agency</Label>
                      <Textarea value={agencyForm.about} onChange={(e) => setAgencyForm(f => ({ ...f, about: e.target.value }))} className="mt-1 resize-none" rows={3} placeholder="Brief description of the agency…" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {agencyInfo.about && (
                    <p className="text-sm text-gray-600 leading-relaxed">{agencyInfo.about}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {agencyInfo.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />{agencyInfo.email}
                      </div>
                    )}
                    {agencyInfo.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />{agencyInfo.phone}
                      </div>
                    )}
                    {agencyInfo.website && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Globe className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <a href={agencyInfo.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{agencyInfo.website}</a>
                      </div>
                    )}
                    {agencyInfo.address && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />{agencyInfo.address}
                      </div>
                    )}
                  </div>
                  {!agencyInfo.email && !agencyInfo.phone && !agencyInfo.website && !agencyInfo.address && !agencyInfo.about && (
                    <p className="text-sm text-gray-400 italic">Click Edit to fill in agency information.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          )}

          {/* My Account */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">My Account</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Full Name</p>
                <p className="font-medium text-gray-800">{user?.full_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Email</p>
                <p className="font-medium text-gray-800">{user?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Account Type</p>
                <p className="font-medium text-gray-800">{user?.is_superuser ? "Super Admin" : "Staff"}</p>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
            </div>
            <div className="p-6 max-w-md">
              <form onSubmit={handleSubmit((d) => changePasswordMutation.mutate({ current_password: d.current_password, new_password: d.new_password }))} className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500">Current Password</Label>
                  <Input type="password" {...register("current_password", { required: "Required" })} className="mt-1" />
                  {errors.current_password && <p className="text-xs text-red-500 mt-1">{errors.current_password.message}</p>}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">New Password</Label>
                  <Input type="password" {...register("new_password", { required: "Required", minLength: { value: 8, message: "Min 8 chars" } })} className="mt-1" />
                  {errors.new_password && <p className="text-xs text-red-500 mt-1">{errors.new_password.message}</p>}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Confirm New Password</Label>
                  <Input type="password" {...register("confirm_password", { required: "Required", validate: (v) => v === newPwd || "Passwords don't match" })} className="mt-1" />
                  {errors.confirm_password && <p className="text-xs text-red-500 mt-1">{errors.confirm_password.message}</p>}
                </div>
                <Button type="submit" disabled={changePasswordMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {changePasswordMutation.isPending ? "Saving…" : "Update Password"}
                </Button>
              </form>
            </div>
          </div>

          {/* Email Notifications — Super Admin only */}
          {isSuperAdmin && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Email Notifications</h3>
              </div>
              {!emailNotifEdit && (
                <button onClick={() => { setEmailNotifForm({ ...emailNotifForm, email: user?.email ?? "" }); setEmailNotifEdit(true); }}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> Configure
                </button>
              )}
            </div>
            <div className="p-6">
              {emailNotifEdit ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500">Email Address</Label>
                    <Input
                      type="email"
                      value={emailNotifForm.email}
                      onChange={(e) => setEmailNotifForm(f => ({ ...f, email: e.target.value }))}
                      className="mt-1"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <p className="text-xs font-semibold text-gray-600 uppercase">Notification Preferences</p>
                    {[
                      { key: "enable_task_overdue", label: "Task Overdue Alerts", desc: "Get notified when tasks become overdue" },
                      { key: "enable_invoice_due", label: "Invoice Due Reminders", desc: "Get reminders about upcoming invoice due dates" },
                      { key: "enable_lead_updates", label: "Lead Stage Changes", desc: "Get notified when lead stages change" },
                      { key: "enable_project_updates", label: "Project Milestones", desc: "Get updates on project milestone completions" },
                      { key: "enable_weekly_report", label: "Weekly Summary", desc: "Receive weekly summary reports" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={key}
                          checked={emailNotifForm[key as keyof EmailNotificationSettings] as boolean}
                          onChange={(e) => setEmailNotifForm(f => ({ ...f, [key]: e.target.checked }))}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                        />
                        <label htmlFor={key} className="flex-1 cursor-pointer">
                          <p className="text-sm font-medium text-gray-800">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => emailNotifMutation.mutate(emailNotifForm)}
                      disabled={emailNotifMutation.isPending || !emailNotifForm.email}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      {emailNotifMutation.isPending ? "Saving…" : "Save Settings"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEmailNotifEdit(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-700">{user?.email ?? "No email configured"}</p>
                  </div>
                  <div className="space-y-2 text-xs text-gray-600">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Task overdue alerts enabled
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Invoice reminders enabled
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Weekly reports enabled
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Activity Log (Super Admin only) */}
          {isSuperAdmin && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Activity Log</h3>
                <span className="ml-auto text-xs text-gray-400">{activityLogs?.length ?? 0} entries</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {!activityLogs || activityLogs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">No activity logs yet.</p>
                ) : activityLogs.map((log) => (
                  <div key={log.id} className="px-6 py-3 flex items-start gap-3 hover:bg-gray-50/60 transition-colors">
                    <div className="h-7 w-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-800 capitalize">{log.action.replace(/_/g, " ")}</span>
                        {log.entity_type && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full capitalize">{log.entity_type}</span>}
                        {log.ip_address && <span className="text-[10px] text-gray-400">{log.ip_address}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 border-t border-gray-50 flex justify-end">
                <a href="/settings/roles" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Manage Roles & Permissions →
                </a>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
