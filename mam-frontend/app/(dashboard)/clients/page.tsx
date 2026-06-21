"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { get, post, patch, del, getMediaUrl } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Building2, Link } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ClientHoverCard } from "@/components/shared/HoverCards";
import type { Client } from "@/types";
import { useAuthStore } from "@/store/auth";

const SERVICES = [
  "Social Media Management",
  "Video Production",
  "Photography",
  "Graphic Design",
  "Content Writing",
  "Other",
];

interface ClientForm {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  industry: string;
  service_type: string;
  status: string;
  monthly_value: string;
  notes: string;
}

export default function ClientsPage() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Client | null>(null);
  const qc = useQueryClient();
  const router = useRouter();
  const { user, hasPermission } = useAuthStore();
  const canViewFinance = user?.is_superuser || hasPermission("view_finance");

  const { data, isLoading } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => get("/clients/"),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => post("/clients/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      resetCreate();
      toast.success("Client created");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Failed to create client");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => patch(`/clients/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setEditOpen(false);
      toast.success("Client updated");
    },
    onError: () => toast.error("Failed to update client"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/clients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client deleted");
    },
    onError: () => toast.error("Failed to delete client"),
  });

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate } = useForm<ClientForm>({
    defaultValues: { status: "active", service_type: "" },
  });

  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit } = useForm<ClientForm>();

  const clients = data ?? [];
  const statusOptions = ["all", "active", "inactive", "prospect"];
  const filtered = clients
    .filter((c) => statusFilter === "all" || c.status === statusFilter)
    .filter((c) => [c.company_name, c.contact_person, c.email, c.phone].join(" ").toLowerCase().includes(search.toLowerCase()));

  const openEdit = (client: Client) => {
    setEditTarget(client);
    resetEdit({
      company_name: client.company_name,
      contact_person: client.contact_person ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      industry: client.industry ?? "",
      service_type: client.service_type ?? "",
      status: client.status,
      monthly_value: client.monthly_value ? String(client.monthly_value) : "",
      notes: "",
    });
    setEditOpen(true);
  };

  const columns: Column<Client>[] = [
    {
      key: "#", label: "#",
      render: (_row, index) => <span className="text-xs text-muted-foreground">{(index ?? 0) + 1}</span>,
    },
    {
      key: "logo_url", label: "",
      render: (row) => row.logo_url ? (
        <img
          src={row.logo_url.startsWith("http") ? row.logo_url : getMediaUrl(row.logo_url)}
          alt={row.company_name}
          className="h-8 w-8 rounded-full object-cover ring-1 ring-gray-200"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
          {row.company_name?.[0]?.toUpperCase() ?? "?"}
        </div>
      ),
    },
    {
      key: "client_code", label: "Code",
      render: (row) => row.client_code ? (
        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{row.client_code}</span>
      ) : "—",
    },
    { key: "company_name", label: "Company", sortable: true },
    { key: "contact_person", label: "Contact Person", sortable: true },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email", sortable: true },
    { key: "industry", label: "Industry", sortable: true },
    {
      key: "service_type", label: "Service", sortable: true,
      render: (row) => row.service_type ? (
        <Badge variant="outline" className="text-xs">{row.service_type}</Badge>
      ) : "—",
    },
    { key: "status", label: "Status", sortable: true, render: (row) => <StatusBadge value={row.status} /> },
    ...(canViewFinance ? [{
      key: "monthly_value", label: "Monthly Value", sortable: true,
      render: (row: Client) => row.monthly_value ? (
        <span className="text-emerald-600 font-medium">${Number(row.monthly_value).toLocaleString()}</span>
      ) : "—",
    }] : []),
    {
      key: "actions", label: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/clients/${row.id}`); }}>
            <Building2 className="h-4 w-4 text-blue-400" />
          </Button>
          <Button variant="ghost" className="h-7 w-7 p-0" onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(window.location.origin + "/clients/" + row.id);
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

  const FormFields = ({ reg }: { reg: ReturnType<typeof useForm<ClientForm>>["register"] }) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Label>Company Name *</Label>
        <Input {...reg("company_name", { required: true })} className="mt-1" />
      </div>
      <div><Label>Contact Person</Label><Input {...reg("contact_person")} className="mt-1" /></div>
      <div><Label>Email</Label><Input type="email" {...reg("email")} className="mt-1" /></div>
      <div><Label>Phone</Label><Input {...reg("phone")} className="mt-1" /></div>
      <div><Label>Industry</Label><Input {...reg("industry")} className="mt-1" /></div>
      <div>
        <Label>Service Type</Label>
        <NativeSelect {...reg("service_type")} className="mt-1">
          <option value="">Select service</option>
          {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
        </NativeSelect>
      </div>
      <div>
        <Label>Status</Label>
        <NativeSelect {...reg("status")} className="mt-1">
          {["active", "inactive", "prospect"].map((s) => <option key={s} value={s}>{s}</option>)}
        </NativeSelect>
      </div>
      {canViewFinance && <div><Label>Monthly Value ($)</Label><Input type="number" step="0.01" {...reg("monthly_value")} className="mt-1" /></div>}
      <div className="col-span-2"><Label>Notes</Label><Input {...reg("notes")} className="mt-1" /></div>
    </div>
  );

  return (
    <>
      <TopBar title="Clients" />
      <main className="flex-1 p-3 sm:p-6 space-y-4 bg-gray-50 min-h-full">
        {/* ── Toolbar ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[140px] max-w-xs h-8 text-sm" />
            <div className="flex-1" />
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{filtered.length} results</span>
            <div className="h-4 w-px bg-gray-200" />
            <Button size="sm" className="h-8" onClick={() => { resetCreate(); setOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Client
            </Button>
          </div>
          <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5">
            {statusOptions.map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter === s ? "bg-white shadow-sm text-blue-600 font-semibold" : "text-gray-500 hover:text-gray-700"}`}>
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Create Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <div className="bg-emerald-600 -mx-4 -mt-4 mb-4 px-4 pt-5 pb-4 rounded-t-xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg"><Building2 className="h-4 w-4 text-white" /></div>
                <div>
                  <h2 className="text-base font-semibold text-white">New Client</h2>
                  <p className="text-xs text-emerald-100">Add a new client to your portfolio</p>
                </div>
              </div>
            </div>
            <form
              onSubmit={handleCreate((d) => createMutation.mutate({
                ...d,
                monthly_value: d.monthly_value ? parseFloat(d.monthly_value) : null,
              }))}
              className="space-y-3"
            >
              <FormFields reg={regCreate} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">{createMutation.isPending ? "Saving…" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
            {editTarget && (
              <form
                onSubmit={handleEdit((d) => updateMutation.mutate({
                  id: editTarget.id,
                  body: { ...d, monthly_value: d.monthly_value ? parseFloat(d.monthly_value) : null },
                }))}
                className="space-y-3"
              >
                <FormFields reg={regEdit} />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving…" : "Save"}</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <DataTable
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No clients found."
          onRowClick={(row) => router.push(`/clients/${row.id}`)}
          renderHoverCard={(row) => <ClientHoverCard client={row} />}
          exportable
          paginated
          defaultPageSize={10}
        />
      </main>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Client"
        description={`Are you sure you want to delete ${confirmTarget?.company_name}? This action cannot be undone.`}
        onConfirm={() => { if (confirmTarget) { deleteMutation.mutate(confirmTarget.id); setConfirmOpen(false); } }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
