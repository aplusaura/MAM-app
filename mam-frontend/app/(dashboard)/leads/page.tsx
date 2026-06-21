"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del } from "@/lib/api";
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
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserCheck, Target, Sparkles, Link } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LeadHoverCard } from "@/components/shared/HoverCards";
import type { Lead, Client } from "@/types";
import { format } from "date-fns";

const STAGES = ["new_lead", "contacted", "meeting_scheduled", "qualified", "proposal_sent", "negotiation", "won", "lost"];
const STAGE_DOT: Record<string, string> = {
  new_lead: "bg-gray-400", contacted: "bg-blue-500", meeting_scheduled: "bg-cyan-500", qualified: "bg-violet-500",
  proposal_sent: "bg-indigo-500", negotiation: "bg-orange-500", won: "bg-green-500", lost: "bg-red-500",
};
const stageLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const SERVICES = [
  "Social Media Management",
  "Video Production",
  "Photography",
  "Graphic Design",
  "Content Writing",
  "Other",
];

interface LeadScore {
  id: number;
  score: number;
  reason: string;
}

interface LeadForm {
  lead_name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  interested_service: string;
  stage: string;
  expected_budget: string;
  notes: string;
}

export default function LeadsPage() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Lead | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Lead | null>(null);
  const [scores, setScores] = useState<Record<number, LeadScore>>({});
  const [scoringLoading, setScoringLoading] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkSelectedRows, setBulkSelectedRows] = useState<Lead[]>([]);
  const [bulkStage, setBulkStage] = useState(STAGES[0]);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: () => get("/leads/"),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => post("/leads/", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setOpen(false);
      resetCreate();
      toast.success("Lead created");
    },
    onError: () => toast.error("Failed to create lead"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => patch(`/leads/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setEditOpen(false);
      toast.success("Lead updated");
    },
    onError: () => toast.error("Failed to update lead"),
  });

  // Stage update — uses setQueryData to avoid re-sort (preserves row order)
  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) => patch(`/leads/${id}`, { stage }),
    onSuccess: (_data, variables) => {
      qc.setQueryData<Lead[]>(["leads"], (old) =>
        old?.map((l) => l.id === variables.id ? { ...l, stage: variables.stage } : l) ?? old
      );
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => post(`/leads/${id}/convert`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setConvertOpen(false);
      setConvertTarget(null);
      toast.success("Lead converted to client");
    },
    onError: () => toast.error("Failed to convert lead"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/leads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted");
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const handleScoreLeads = async () => {
    setScoringLoading(true);
    toast.info("Scoring leads with AI...");
    try {
      const result: LeadScore[] = await post("/ai/score-leads", {});
      const map: Record<number, LeadScore> = {};
      result.forEach((s) => { map[s.id] = s; });
      setScores(map);
      toast.success(`Scored ${result.length} lead${result.length !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to score leads");
    } finally {
      setScoringLoading(false);
    }
  };

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate } = useForm<LeadForm>({
    defaultValues: { stage: "new_lead" },
  });

  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit } = useForm<LeadForm>();

  const leads = data ?? [];
  const filtered = leads
    .filter((l) => stageFilter === "all" || l.stage === stageFilter)
    .filter((l) => [l.lead_name, l.company_name, l.contact_person, (l as Lead & { phone?: string }).phone, (l as Lead & { email?: string }).email].join(" ").toLowerCase().includes(search.toLowerCase()));

  const openEdit = (lead: Lead) => {
    setEditTarget(lead);
    const l = lead as Lead & { phone?: string; email?: string };
    resetEdit({
      lead_name: lead.lead_name,
      company_name: lead.company_name ?? "",
      contact_person: lead.contact_person ?? "",
      phone: l.phone ?? "",
      email: l.email ?? "",
      interested_service: lead.interested_service ?? "",
      stage: lead.stage,
      expected_budget: lead.expected_budget ? String(lead.expected_budget) : "",
      notes: lead.notes ?? "",
    });
    setEditOpen(true);
  };

  const columns: Column<Lead>[] = [
    {
      key: "#", label: "#",
      render: (_row, index) => <span className="text-xs text-muted-foreground">{(index ?? 0) + 1}</span>,
    },
    { key: "lead_name", label: "Lead Name", sortable: true },
    { key: "company_name", label: "Company", sortable: true },
    { key: "contact_person", label: "Contact", sortable: true },
    { key: "phone", label: "Phone", render: (row) => (row as Lead & { phone?: string }).phone ?? "—" },
    { key: "email", label: "Email", sortable: true, render: (row) => (row as Lead & { email?: string }).email ?? "—" },
    {
      key: "interested_service", label: "Service", sortable: true,
      render: (row) => row.interested_service ? (
        <Badge variant="outline" className="text-xs">{row.interested_service}</Badge>
      ) : "—",
    },
    {
      key: "stage", label: "Stage",
      render: (row) => (
        <Select
          value={row.stage}
          onValueChange={(v) => v && updateStageMutation.mutate({ id: row.id, stage: v })}
        >
          <SelectTrigger className="h-7 w-40 text-xs" onClick={(e) => e.stopPropagation()}>
            <SelectValue><StatusBadge value={row.stage} /></SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${STAGE_DOT[s] ?? "bg-gray-400"}`} />
                  {stageLabel(s)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "expected_budget", label: "Budget", sortable: true,
      render: (row) => row.expected_budget ? (
        <span className="text-emerald-600 font-medium">${Number(row.expected_budget).toLocaleString()}</span>
      ) : "—",
    },
    {
      key: "created_at", label: "Date Added", sortable: true,
      render: (row) => {
        const r = row as Lead & { created_at?: string };
        return r.created_at ? format(new Date(r.created_at), "MMM d, yyyy") : "—";
      },
    },
    {
      key: "updated_at", label: "Last Updated",
      render: (row) => {
        const r = row as Lead & { updated_at?: string; created_at?: string };
        return (r.updated_at || r.created_at) ? format(new Date(r.updated_at || r.created_at!), "MMM d, yyyy") : "—";
      },
    },
    {
      key: "score" as keyof Lead, label: "Score",
      render: (row) => {
        const s = scores[row.id];
        if (!s) return <span className="text-xs text-gray-300">—</span>;
        if (s.score >= 80) return <span title={s.reason} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">High {s.score}</span>;
        if (s.score >= 50) return <span title={s.reason} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Med {s.score}</span>;
        return <span title={s.reason} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Low {s.score}</span>;
      },
    },
    {
      key: "actions", label: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.stage === "won" && (
            <button className="inline-flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md transition-colors" onClick={(e) => {
              e.stopPropagation();
              setConvertTarget(row);
              setConvertOpen(true);
            }}>
              <UserCheck className="h-3 w-3" />Convert
            </button>
          )}
          <Button variant="ghost" className="h-7 w-7 p-0" onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(window.location.origin + "/leads/" + row.id);
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

  return (
    <>
      <TopBar title="Leads / CRM" />
      <main className="flex-1 p-3 sm:p-6 space-y-4 bg-gray-50 min-h-full">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <Input placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[140px] max-w-xs h-8 text-sm" />
            <div className="flex-1" />
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{filtered.length} results</span>
            <div className="h-4 w-px bg-gray-200" />
            <Button size="sm" variant="outline" className="h-8" onClick={handleScoreLeads} disabled={scoringLoading}>
              <Sparkles className="h-3.5 w-3.5 mr-1" />{scoringLoading ? "Scoring…" : "Score Leads"}
            </Button>
            <Button size="sm" className="h-8" onClick={() => { resetCreate(); setOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Lead
            </Button>
          </div>
          <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5 overflow-x-auto">
            {["all", ...STAGES].map((s) => (
              <button key={s} onClick={() => setStageFilter(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${stageFilter === s ? "bg-white shadow-sm text-blue-600 font-semibold" : "text-gray-500 hover:text-gray-700"}`}>
                {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Create Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <form
              onSubmit={handleCreate((d) => createMutation.mutate({
                ...d,
                expected_budget: d.expected_budget ? parseFloat(d.expected_budget) : null,
              }))}
              className="space-y-3"
            >
              <div className="bg-purple-600 -mx-4 -mt-4 mb-4 px-4 pt-5 pb-4 rounded-t-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-lg"><Target className="h-4 w-4 text-white" /></div>
                  <div>
                    <h2 className="text-base font-semibold text-white">New Lead</h2>
                    <p className="text-xs text-purple-100">Add a potential client to your pipeline</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Lead Name *</Label><Input {...regCreate("lead_name", { required: true })} className="mt-1" /></div>
                <div><Label>Company</Label><Input {...regCreate("company_name")} className="mt-1" /></div>
                <div><Label>Contact Person</Label><Input {...regCreate("contact_person")} className="mt-1" /></div>
                <div><Label>Phone</Label><Input {...regCreate("phone")} className="mt-1" /></div>
                <div><Label>Email</Label><Input type="email" {...regCreate("email")} className="mt-1" /></div>
                <div>
                  <Label>Interested Service</Label>
                  <NativeSelect {...regCreate("interested_service")} className="mt-1">
                    <option value="">Select service</option>
                    {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <Label>Stage</Label>
                  <NativeSelect {...regCreate("stage")} className="mt-1">
                    {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </NativeSelect>
                </div>
                <div><Label>Expected Budget ($)</Label><Input type="number" {...regCreate("expected_budget")} className="mt-1" /></div>
                <div className="col-span-2"><Label>Notes</Label><Input {...regCreate("notes")} className="mt-1" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white">{createMutation.isPending ? "Saving…" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
            <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
            {editTarget && (
              <form
                onSubmit={handleEdit((d) => updateMutation.mutate({
                  id: editTarget.id,
                  body: { ...d, expected_budget: d.expected_budget ? parseFloat(d.expected_budget) : null },
                }))}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Lead Name *</Label><Input {...regEdit("lead_name", { required: true })} className="mt-1" /></div>
                  <div><Label>Company</Label><Input {...regEdit("company_name")} className="mt-1" /></div>
                  <div><Label>Contact Person</Label><Input {...regEdit("contact_person")} className="mt-1" /></div>
                  <div><Label>Phone</Label><Input {...regEdit("phone")} className="mt-1" /></div>
                  <div><Label>Email</Label><Input type="email" {...regEdit("email")} className="mt-1" /></div>
                  <div>
                    <Label>Interested Service</Label>
                    <NativeSelect {...regEdit("interested_service")} className="mt-1">
                      <option value="">Select service</option>
                      {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </NativeSelect>
                  </div>
                  <div>
                    <Label>Stage</Label>
                    <NativeSelect {...regEdit("stage")} className="mt-1">
                      {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </NativeSelect>
                  </div>
                  <div><Label>Expected Budget ($)</Label><Input type="number" {...regEdit("expected_budget")} className="mt-1" /></div>
                  <div className="col-span-2"><Label>Notes</Label><Input {...regEdit("notes")} className="mt-1" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving…" : "Save"}</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <div className="overflow-x-auto">
          <DataTable
              columns={columns}
              data={filtered}
              isLoading={isLoading}
              emptyMessage="No leads found."
              exportable
              paginated
              defaultPageSize={10}
              bulkActionLabel="Update Stage"
              onBulkAction={(rows) => { setBulkSelectedRows(rows as Lead[]); setBulkStage(STAGES[0]); setBulkDialogOpen(true); }}
              renderHoverCard={(row) => (
                <LeadHoverCard
                  lead={{
                    id: row.id,
                    lead_name: row.lead_name,
                    company_name: row.company_name,
                    contact_person: row.contact_person,
                    stage: row.stage,
                    interested_service: row.interested_service,
                    expected_budget: row.expected_budget,
                    phone: (row as Lead & { phone?: string }).phone,
                    email: (row as Lead & { email?: string }).email,
                  }}
                />
              )}
            />
          </div>
      </main>

      {/* Convert to Client Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader><DialogTitle>Convert Lead to Client</DialogTitle></DialogHeader>
          {convertTarget && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                convertMutation.mutate({
                  id: convertTarget.id,
                  body: {
                    company_name: fd.get("company_name") as string,
                    contact_person: fd.get("contact_person") as string || undefined,
                    phone: fd.get("phone") as string || undefined,
                    email: fd.get("email") as string || undefined,
                    monthly_value: fd.get("monthly_value") ? Number(fd.get("monthly_value")) : undefined,
                    service_type: convertTarget.interested_service || undefined,
                    status: "active",
                  },
                });
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Company Name *</Label>
                  <Input name="company_name" defaultValue={convertTarget.company_name ?? convertTarget.lead_name} required className="mt-1" />
                </div>
                <div>
                  <Label>Contact Person</Label>
                  <Input name="contact_person" defaultValue={convertTarget.contact_person ?? ""} className="mt-1" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input name="phone" defaultValue={(convertTarget as Lead & { phone?: string }).phone ?? ""} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" defaultValue={(convertTarget as Lead & { email?: string }).email ?? ""} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Monthly Value ($)</Label>
                  <Input name="monthly_value" type="number" min="0" step="0.01" defaultValue={convertTarget.expected_budget ?? ""} className="mt-1" placeholder="0.00" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={convertMutation.isPending} className="bg-green-600 hover:bg-green-700">
                  {convertMutation.isPending ? "Converting…" : "Convert to Client"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Update Stage Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Stage</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{bulkSelectedRows.length} lead{bulkSelectedRows.length !== 1 ? "s" : ""} selected</p>
          <div className="space-y-2 pt-1">
            <Label>New Stage</Label>
            <NativeSelect value={bulkStage} onChange={(e) => setBulkStage(e.target.value)} className="mt-1">
              {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </NativeSelect>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button
              type="button"
              onClick={async () => {
                await Promise.all(bulkSelectedRows.map((row) => patch(`/leads/${row.id}`, { stage: bulkStage })));
                qc.invalidateQueries({ queryKey: ["leads"] });
                toast.success(`Updated ${bulkSelectedRows.length} lead${bulkSelectedRows.length !== 1 ? "s" : ""} to "${bulkStage.replace(/_/g, " ")}"`);
                setBulkDialogOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Lead"
        description={`Are you sure you want to delete ${confirmTarget?.lead_name}? This action cannot be undone.`}
        onConfirm={() => { if (confirmTarget) { deleteMutation.mutate(confirmTarget.id); setConfirmOpen(false); } }}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
