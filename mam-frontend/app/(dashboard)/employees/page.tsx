"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { get, post, patch, del } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Copy, Eye, EyeOff, Pencil, Trash2, User, UserPlus } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmployeeHoverCard } from "@/components/shared/HoverCards";
import { useTranslation } from "@/hooks/useTranslation";
import type { Employee, EmployeeCreated, Department, Role } from "@/types";

interface EmployeeForm {
  full_name: string;
  job_title: string;
  phone: string;
  employment_type: string;
  department_id: string;
  role_id: string;
  skills: string;
  status: string;
  availability_status: string;
}

export default function EmployeesPage() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [credDialog, setCredDialog] = useState(false);
  const [credentials, setCredentials] = useState<EmployeeCreated | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Employee | null>(null);
  const qc = useQueryClient();
  const router = useRouter();
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => get("/employees/"),
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: () => get("/departments/"),
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => get("/roles/"),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => post<EmployeeCreated>("/employees/", body),
    onSuccess: (res: EmployeeCreated) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setOpen(false);
      resetCreate();
      setCredentials(res);
      setCredDialog(true);
      toast.success("Employee created");
    },
    onError: () => toast.error("Failed to create employee"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => patch(`/employees/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setEditOpen(false);
      toast.success("Employee updated");
    },
    onError: () => toast.error("Failed to update employee"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee deleted");
    },
    onError: () => toast.error("Failed to delete employee"),
  });

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate } = useForm<EmployeeForm>({
    defaultValues: { employment_type: "full_time", status: "active", availability_status: "available" },
  });

  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit } = useForm<EmployeeForm>();

  const employees = data ?? [];
  const filtered = employees
    .filter((e) => !deptFilter || String(e.department_id) === deptFilter)
    .filter((e) => [e.full_name, e.job_title].join(" ").toLowerCase().includes(search.toLowerCase()));

  const deptMap = Object.fromEntries((departments ?? []).map((d) => [d.id, d.name]));
  const roleMap = Object.fromEntries((roles ?? []).map((r) => [r.id, r.name]));

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    resetEdit({
      full_name: emp.full_name,
      job_title: emp.job_title ?? "",
      phone: emp.phone ?? "",
      employment_type: emp.employment_type ?? "full_time",
      department_id: emp.department_id ? String(emp.department_id) : "",
      role_id: emp.role_id ? String(emp.role_id) : "",
      skills: emp.skills?.join(", ") ?? "",
      status: emp.status,
      availability_status: emp.availability_status,
    });
    setEditOpen(true);
  };

  const columns: Column<Employee>[] = [
    {
      key: "#", label: "#",
      render: (_row, index) => <span className="text-xs text-muted-foreground">{(index ?? 0) + 1}</span>,
    },
    {
      key: "full_name", label: t("name"), sortable: true,
      render: (row) => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
            {row.profile_image_url ? (
              <img
                src={row.profile_image_url.startsWith("http") ? row.profile_image_url : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:8000"}${row.profile_image_url}`}
                alt={row.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              row.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <p className="font-medium text-sm">{row.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.job_title ?? ""}</p>
          </div>
        </div>
      ),
    },
    {
      key: "department_id", label: t("department"), sortable: true,
      render: (row) => row.department_id ? deptMap[row.department_id] ?? String(row.department_id) : "—",
    },
    {
      key: "role_id", label: t("role"),
      render: (row) => row.role_id ? (
        <span className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600">{roleMap[row.role_id] ?? String(row.role_id)}</span>
      ) : "—",
    },
    { key: "status", label: t("status"), sortable: true, render: (row) => <StatusBadge value={row.status} /> },
    { key: "availability_status", label: t("availabilityStatus"), sortable: true, render: (row) => <StatusBadge value={row.availability_status} /> },
    {
      key: "skills", label: "Skills",
      render: (row) => row.skills?.length ? (
        <div className="flex flex-wrap gap-1">
          {row.skills.slice(0, 2).map((s) => <span key={s} className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs">{s}</span>)}
          {row.skills.length > 2 && <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-xs">+{row.skills.length - 2}</span>}
        </div>
      ) : "—",
    },
    {
      key: "actions", label: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/employees/${row.id}`); }}>
            <User className="h-4 w-4 text-blue-400" />
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

  return (
    <>
      <TopBar title={t("employees")} />
      <main className="flex-1 p-3 sm:p-6 space-y-4 bg-gray-50 min-h-full">
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <div className="flex items-center justify-between">
              <span>Failed to load employees.</span>
              <button onClick={() => refetch()} className="ml-4 underline font-medium">Retry</button>
            </div>
          </div>
        )}
        {/* ── Toolbar ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
          <Input placeholder={`${t("search")}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[140px] max-w-xs h-8 text-sm" />
          <NativeSelect value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="w-44 h-8 text-sm">
            <option value="">All Departments</option>
            {(departments ?? []).map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
          </NativeSelect>
          <div className="flex-1" />
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{filtered.length} results</span>
          <div className="h-4 w-px bg-gray-200" />
          <Button size="sm" className="h-8" onClick={() => { resetCreate(); setOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> {t("addEmployee")}
          </Button>
        </div>

        {/* Create Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <div className="bg-teal-600 -mx-4 -mt-4 mb-4 px-4 pt-5 pb-4 rounded-t-xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg"><UserPlus className="h-4 w-4 text-white" /></div>
                <div>
                  <h2 className="text-base font-semibold text-white">New Employee</h2>
                  <p className="text-xs text-teal-100">Add a new team member to your organization</p>
                </div>
              </div>
            </div>
            <form
              onSubmit={handleCreate((d) => createMutation.mutate({
                ...d,
                department_id: d.department_id ? parseInt(d.department_id) : null,
                role_id: d.role_id ? parseInt(d.role_id) : null,
                skills: d.skills ? d.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
              }))}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>{t("fullName")} *</Label><Input {...regCreate("full_name", { required: true })} className="mt-1" /></div>
                <div><Label>{t("jobTitle")}</Label><Input {...regCreate("job_title")} className="mt-1" /></div>
                <div><Label>{t("phone")}</Label><Input {...regCreate("phone")} className="mt-1" /></div>
                <div>
                  <Label>{t("department")}</Label>
                  <NativeSelect {...regCreate("department_id")} className="mt-1">
                    <option value="">Select department</option>
                    {(departments ?? []).map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <Label>{t("role")}</Label>
                  <NativeSelect {...regCreate("role_id")} className="mt-1">
                    <option value="">Select role</option>
                    {(roles ?? []).map((r) => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <Label>{t("employmentType")}</Label>
                  <NativeSelect {...regCreate("employment_type")} className="mt-1">
                    {["full_time", "part_time", "contractor", "intern"].map((et) => (
                      <option key={et} value={et}>{et.replace(/_/g, " ")}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <Label>{t("status")}</Label>
                  <NativeSelect {...regCreate("status")} className="mt-1">
                    {["active", "inactive", "on_leave"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </NativeSelect>
                </div>
                <div className="col-span-2">
                  <Label>Skills</Label>
                  <Input {...regCreate("skills")} className="mt-1" placeholder="Comma separated: Premiere Pro, Photoshop..." />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-teal-600 hover:bg-teal-700 text-white">{createMutation.isPending ? "Saving..." : t("create")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <DialogHeader><DialogTitle>{t("editEmployee")}</DialogTitle></DialogHeader>
            {editTarget && (
              <form
                onSubmit={handleEdit((d) => updateMutation.mutate({
                  id: editTarget.id,
                  body: {
                    ...d,
                    department_id: d.department_id ? parseInt(d.department_id) : null,
                    role_id: d.role_id ? parseInt(d.role_id) : null,
                    skills: d.skills ? d.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
                  },
                }))}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>{t("fullName")} *</Label><Input {...regEdit("full_name", { required: true })} className="mt-1" /></div>
                  <div><Label>{t("jobTitle")}</Label><Input {...regEdit("job_title")} className="mt-1" /></div>
                  <div><Label>{t("phone")}</Label><Input {...regEdit("phone")} className="mt-1" /></div>
                  <div>
                    <Label>{t("department")}</Label>
                    <NativeSelect {...regEdit("department_id")} className="mt-1">
                      <option value="">Select department</option>
                      {(departments ?? []).map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label>{t("role")}</Label>
                    <NativeSelect {...regEdit("role_id")} className="mt-1">
                      <option value="">Select role</option>
                      {(roles ?? []).map((r) => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label>{t("employmentType")}</Label>
                    <NativeSelect {...regEdit("employment_type")} className="mt-1">
                      {["full_time", "part_time", "contractor", "intern"].map((et) => (
                        <option key={et} value={et}>{et.replace(/_/g, " ")}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label>{t("status")}</Label>
                    <NativeSelect {...regEdit("status")} className="mt-1">
                      {["active", "inactive", "on_leave"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label>{t("availabilityStatus")}</Label>
                    <NativeSelect {...regEdit("availability_status")} className="mt-1">
                      {["available", "busy", "on_leave"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </NativeSelect>
                  </div>
                  <div className="col-span-2">
                    <Label>Skills</Label>
                    <Input {...regEdit("skills")} className="mt-1" placeholder="Comma separated" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>{t("cancel")}</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : t("save")}</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Credentials dialog */}
        <Dialog open={credDialog} onOpenChange={setCredDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Employee Created — Save Credentials</DialogTitle></DialogHeader>
            {credentials && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Share these login credentials with the employee.</p>
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{credentials.full_name}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <code className="flex-1 bg-white border rounded px-3 py-2 text-sm">{credentials.generated_email}</code>
                        <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(credentials.generated_email ?? ""); toast.success("Copied"); }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Password</Label>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <code className="flex-1 bg-white border rounded px-3 py-2 text-sm font-mono">
                          {showPass ? credentials.generated_password : "••••••••••••"}
                        </code>
                        <Button size="icon" variant="ghost" onClick={() => setShowPass(!showPass)}>
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(credentials.generated_password ?? ""); toast.success("Copied"); }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex justify-end">
                  <Button onClick={() => setCredDialog(false)}>Done</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage={t("noData")}
          onRowClick={(row) => router.push(`/employees/${row.id}`)}
          renderHoverCard={(row) => (
            <EmployeeHoverCard
              employee={row}
              departmentName={departments?.find(d => d.id === row.department_id)?.name}
            />
          )}
          exportable
          paginated
          defaultPageSize={10}
        />
      </main>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`${t("delete")} ${t("employees")}`}
        description={`Are you sure you want to delete ${confirmTarget?.full_name}? This action cannot be undone.`}
        onConfirm={() => { if (confirmTarget) { deleteMutation.mutate(confirmTarget.id); setConfirmOpen(false); } }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
