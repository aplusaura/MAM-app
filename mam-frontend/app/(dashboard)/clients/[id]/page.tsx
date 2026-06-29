"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch, getErrorMessage, api, getMediaUrl } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, DollarSign, FileText, Pencil, X, Check, Upload } from "lucide-react";
import type { Client, Project, Invoice, Task } from "@/types";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

interface ClientDetail extends Client {
  contacts?: { id: number; name: string; role?: string; phone?: string; email?: string; is_primary: boolean }[];
  client_notes?: { id: number; content: string; created_at: string }[];
}

interface EditForm {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  industry: string;
  service_type: string;
  package_type: string;
  contract_type: string;
  start_date: string;
  renewal_date: string;
  monthly_value: string;
  contract_value: string;
  status: string;
  notes: string;
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, hasPermission } = useAuthStore();
  const qc = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { t } = useTranslation();
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({} as EditForm);
  const [notesEditMode, setNotesEditMode] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const { data: client, isLoading } = useQuery<ClientDetail>({
    queryKey: ["clients", id],
    queryFn: () => get(`/clients/${id}`),
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => get("/projects/"),
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: () => get("/finance/invoices"),
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => get("/tasks/"),
  });

  const canEdit = user?.is_superuser || hasPermission("edit_client");
  const canViewFinance = user?.is_superuser || hasPermission("view_finance");

  const clientId = parseInt(id);
  const clientProjects = (projects ?? []).filter((p) => p.client_id === clientId);
  const clientInvoices = (invoices ?? []).filter((i) => i.client_id === clientId);
  const clientTasks = (tasks ?? []).filter((t) => t.client_id === clientId);
  const totalInvoiced = clientInvoices.reduce((s, i) => s + (i.total_amount ?? 0), 0);
  const totalPaid = clientInvoices.reduce((s, i) => s + (i.amount_paid ?? 0), 0);

  const updateMutation = useMutation({
    mutationFn: (body: object) => patch(`/clients/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setEditMode(false);
      toast.success("Client updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const notesMutation = useMutation({
    mutationFn: (notes: string) => patch(`/clients/${id}`, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", id] });
      setNotesEditMode(false);
      toast.success("Notes saved");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/clients/${id}/upload-logo`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", id] });
      toast.success("Logo uploaded");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const buildEditForm = (c: ClientDetail): EditForm => ({
    company_name: c.company_name ?? "",
    contact_person: c.contact_person ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    industry: c.industry ?? "",
    service_type: c.service_type ?? "",
    package_type: c.package_type ?? "",
    contract_type: c.contract_type ?? "",
    start_date: c.start_date ? c.start_date.slice(0, 10) : "",
    renewal_date: c.renewal_date ? c.renewal_date.slice(0, 10) : "",
    monthly_value: c.monthly_value ? String(c.monthly_value) : "",
    contract_value: c.contract_value ? String(c.contract_value) : "",
    status: c.status ?? "active",
    notes: c.notes ?? "",
  });

  const openEdit = () => {
    if (!client) return;
    setEditForm(buildEditForm(client));
    setEditMode(true);
  };


  if (isLoading) return (
    <>
      <TopBar title={t("clientDetails")} />
      <main className="flex-1 p-3 sm:p-6"><p className="text-muted-foreground">{t("loading")}...</p></main>
    </>
  );

  if (!client) return (
    <>
      <TopBar title={t("clientDetails")} />
      <main className="flex-1 p-3 sm:p-6"><p className="text-muted-foreground">Client not found.</p></main>
    </>
  );

  return (
    <>
      <TopBar title={client.company_name} />
      <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50 min-h-full">
        {/* Back + Edit buttons */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t("back")}
          </Button>
          {canEdit && !editMode && (
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-4 w-4 mr-2" /> {t("editClient")}
            </Button>
          )}
          {editMode && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { if (client) setEditForm(buildEditForm(client)); setEditMode(false); }}>
                <X className="h-4 w-4 mr-1" /> {t("cancel")}
              </Button>
              <Button
                size="sm"
                onClick={() => updateMutation.mutate({
                  ...editForm,
                  monthly_value: editForm.monthly_value ? parseFloat(editForm.monthly_value) : null,
                  contract_value: editForm.contract_value ? parseFloat(editForm.contract_value) : null,
                })}
                disabled={updateMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" /> {updateMutation.isPending ? "Saving..." : t("save")}
              </Button>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Logo / Avatar */}
            <div className="relative group">
              {client.logo_url ? (
                <img
                  src={getMediaUrl(client.logo_url!)}
                  alt={client.company_name}
                  className="h-16 w-16 rounded-2xl object-cover border"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold">
                  {client.company_name[0]}
                </div>
              )}
              {canEdit && (
                <>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="absolute inset-0 rounded-2xl bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    title="Upload logo"
                  >
                    <Upload className="h-5 w-5" />
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) logoMutation.mutate(file);
                  }} />
                </>
              )}
            </div>

            <div>
              {editMode ? (
                <Input
                  value={editForm.company_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
                  className="text-xl font-bold h-9 mb-1"
                />
              ) : (
                <h2 className="text-2xl font-bold">{client.company_name}</h2>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {editMode ? (
                  <div className="relative">
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      className="appearance-none text-xs border border-gray-200 rounded-lg px-2.5 pr-7 py-1 bg-white font-medium text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                    >
                      {["active", "inactive", "paused", "churned"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center">
                      <svg className="h-3 w-3 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <StatusBadge value={client.status} />
                )}
                {client.client_code && (
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{client.client_code}</span>
                )}
                {!editMode && client.industry && <Badge variant="outline">{client.industry}</Badge>}
                {!editMode && client.service_type && <Badge variant="secondary">{client.service_type}</Badge>}
              </div>
            </div>
          </div>
          {!editMode && client.monthly_value && canViewFinance && (
            <div className="text-right">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{t("monthlyValue")}</p>
              <p className="text-2xl font-bold text-emerald-600">${Number(client.monthly_value).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Edit Form Grid (inline, shown when editMode) */}
        {editMode && (
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edit Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {([
                  ["contact_person", t("contactPerson"), "text"],
                  ["email", t("email"), "email"],
                  ["phone", t("phone"), "text"],
                  ["industry", t("industry"), "text"],
                  ["service_type", t("serviceType"), "text"],
                  ["package_type", t("packageType"), "text"],
                  ["contract_type", t("contractType"), "text"],
                  ...(canViewFinance ? [
                    ["monthly_value", `${t("monthlyValue")} ($)`, "number"],
                    ["contract_value", `${t("contractValue")} ($)`, "number"],
                  ] as [keyof EditForm, string, string][] : []),
                  ["start_date", t("date"), "date"],
                  ["renewal_date", t("renewalDate"), "date"],
                ] as [keyof EditForm, string, string][]).map(([key, label, type]) => (
                  <div key={key}>
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type={type}
                      value={editForm[key]}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                ))}
                <div className="col-span-2 md:col-span-3">
                  <Label className="text-xs">{t("address")}</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Cards (read mode only) */}
        {!editMode && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Info</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {client.contact_person && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{client.contact_person}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">{client.email}</a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.renewal_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Renewal: {format(new Date(client.renewal_date), "MMM d, yyyy")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {canViewFinance ? (
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Finance Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Invoiced</span>
                    <span className="font-medium text-gray-900">${totalInvoiced.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Paid</span>
                    <span className="font-medium text-emerald-600">${totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Outstanding</span>
                    <span className="font-medium text-red-600">${(totalInvoiced - totalPaid).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Invoices</span>
                    <span className="font-medium">{clientInvoices.length}</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Projects</span>
                    <span className="font-medium">{clientProjects.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active</span>
                    <span className="font-medium text-blue-600">{clientProjects.filter((p) => p.status === "active").length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tasks</span>
                    <span className="font-medium">{clientTasks.length}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-xl border-gray-100 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Projects</span>
                  <span className="font-medium">{clientProjects.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active</span>
                  <span className="font-medium text-blue-600">{clientProjects.filter((p) => p.status === "active").length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasks</span>
                  <span className="font-medium">{clientTasks.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projects */}
        {clientProjects.length > 0 && (
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Projects</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {clientProjects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      {p.due_date && <p className="text-xs text-muted-foreground">Due {format(new Date(p.due_date), "MMM d, yyyy")}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${p.progress_percent ?? 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{p.progress_percent ?? 0}%</span>
                      </div>
                      <StatusBadge value={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoices — admin/finance only */}
        {canViewFinance && clientInvoices.length > 0 && (
          <Card className="rounded-xl border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoices</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-700">{format(new Date(inv.issue_date), "MMM d, yyyy")}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">${Number(inv.total_amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">${Number(inv.amount_paid).toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge value={inv.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Contract Details (read mode) */}
        {!editMode && (client.address || client.package_type || client.contract_type || client.start_date || client.contract_value) && (
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><FileText className="h-4 w-4" />Contract Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {client.address && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{t("address")}</p>
                  <p className="text-sm mt-0.5">{client.address}</p>
                </div>
              )}
              {client.package_type && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("packageType")}</p>
                  <Badge variant="outline" className="mt-0.5 text-xs">{client.package_type}</Badge>
                </div>
              )}
              {client.contract_type && (
                <div>
                  <p className="text-xs text-muted-foreground">{t("contractType")}</p>
                  <Badge variant="outline" className="mt-0.5 text-xs">{client.contract_type}</Badge>
                </div>
              )}
              {client.start_date && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Start Date</p>
                  <p className="text-sm mt-0.5">{format(new Date(client.start_date), "MMM d, yyyy")}</p>
                </div>
              )}
              {canViewFinance && client.contract_value && (
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />{t("contractValue")}</p>
                  <p className="text-sm font-medium mt-0.5">${Number(client.contract_value).toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2"><FileText className="h-4 w-4" />{t("clientNotes")}</CardTitle>
            {canEdit && !notesEditMode && !editMode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => { setNotesValue(client.notes ?? ""); setNotesEditMode(true); }}
              >
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {notesEditMode ? (
              <div className="space-y-2">
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
                  placeholder="Add notes about this client..."
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setNotesEditMode(false)}>{t("cancel")}</Button>
                  <Button size="sm" onClick={() => notesMutation.mutate(notesValue)} disabled={notesMutation.isPending}>
                    {notesMutation.isPending ? "Saving..." : t("save")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[40px]">
                {client.notes || <span className="text-muted-foreground italic">No notes yet.</span>}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
