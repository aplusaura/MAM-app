"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch, del } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ArrowLeft, Pencil, Trash2, UserCheck, Mail, Phone, DollarSign, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import type { Lead } from "@/types";

const STAGE_DOT: Record<string, string> = {
  new_lead: "bg-gray-400",
  contacted: "bg-blue-400",
  meeting_scheduled: "bg-cyan-500",
  qualified: "bg-yellow-400",
  proposal_sent: "bg-purple-400",
  negotiation: "bg-orange-400",
  won: "bg-green-500",
  lost: "bg-red-500",
};

const STAGES = ["new_lead", "contacted", "meeting_scheduled", "qualified", "proposal_sent", "negotiation", "won", "lost"];

const SERVICES = [
  "Social Media Management",
  "Video Production",
  "Photography",
  "Graphic Design",
  "Content Writing",
  "Other",
];

const stageLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface LeadDetail extends Lead {
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

interface EditForm {
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

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const { data: lead, isLoading } = useQuery<LeadDetail>({
    queryKey: ["leads", id],
    queryFn: () => get(`/leads/${id}`),
  });

  const { register, handleSubmit, reset } = useForm<EditForm>();

  const updateMutation = useMutation({
    mutationFn: (body: object) => patch(`/leads/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      setEditOpen(false);
      toast.success("Lead updated");
    },
    onError: () => toast.error("Failed to update lead"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => del(`/leads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted");
      router.push("/leads");
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const convertMutation = useMutation({
    mutationFn: (body: object) => (import("@/lib/api").then((m) => m.post(`/leads/${id}/convert`, body))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setConvertOpen(false);
      toast.success("Lead converted to client");
    },
    onError: () => toast.error("Failed to convert lead"),
  });

  const openEdit = () => {
    if (!lead) return;
    reset({
      lead_name: lead.lead_name ?? "",
      company_name: lead.company_name ?? "",
      contact_person: lead.contact_person ?? "",
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      interested_service: lead.interested_service ?? "",
      stage: lead.stage ?? "new_lead",
      expected_budget: lead.expected_budget ? String(lead.expected_budget) : "",
      notes: lead.notes ?? "",
    });
    setEditOpen(true);
  };

  if (isLoading) return (
    <>
      <TopBar title="Lead Detail" />
      <main className="flex-1 p-3 sm:p-6"><p className="text-muted-foreground">Loading...</p></main>
    </>
  );

  if (!lead) return (
    <>
      <TopBar title="Lead Detail" />
      <main className="flex-1 p-3 sm:p-6"><p className="text-muted-foreground">Lead not found.</p></main>
    </>
  );

  const dot = STAGE_DOT[lead.stage] ?? "bg-gray-400";

  return (
    <>
      <TopBar title={lead.lead_name} />
      <main className="flex-1 p-3 sm:p-6 space-y-4 bg-gray-50 min-h-full">

        {/* Back + action buttons */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/leads")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Leads
          </Button>
          <div className="flex items-center gap-2">
            {lead.stage === "won" && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setConvertOpen(true)}>
                <UserCheck className="h-4 w-4 mr-1.5" /> Convert to Client
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-4 w-4 mr-1.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          </div>
        </div>

        {/* Header card */}
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{lead.lead_name}</h2>
                {lead.company_name && (
                  <p className="text-sm text-muted-foreground mt-0.5">{lead.company_name}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dot}`} />
                  <span className="text-sm font-medium text-gray-700">{stageLabel(lead.stage)}</span>
                </div>
              </div>
              {lead.expected_budget && (
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Budget</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${Number(lead.expected_budget).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact Info */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.contact_person && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-4">@</span>
                  <span>{lead.contact_person}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline break-all">{lead.email}</a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {!lead.contact_person && !lead.email && !lead.phone && (
                <p className="text-sm text-muted-foreground italic">No contact info recorded.</p>
              )}
            </CardContent>
          </Card>

          {/* Lead Info */}
          <Card className="rounded-xl border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lead Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.interested_service && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <Badge variant="outline" className="text-xs">{lead.interested_service}</Badge>
                </div>
              )}
              {lead.expected_budget && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />Budget</span>
                  <span className="font-medium text-emerald-600">${Number(lead.expected_budget).toLocaleString()}</span>
                </div>
              )}
              {lead.created_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Created</span>
                  <span>{format(new Date(lead.created_at), "MMM d, yyyy")}</span>
                </div>
              )}
              {lead.updated_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Last Updated</span>
                  <span>{format(new Date(lead.updated_at), "MMM d, yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <Card className="rounded-xl border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <FileText className="h-4 w-4" />Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[40px]">
              {lead.notes || <span className="text-muted-foreground italic">No notes recorded.</span>}
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          <form
            onSubmit={handleSubmit((d) =>
              updateMutation.mutate({
                ...d,
                expected_budget: d.expected_budget ? parseFloat(d.expected_budget) : null,
              })
            )}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Lead Name *</Label><Input {...register("lead_name", { required: true })} className="mt-1" /></div>
              <div><Label>Company</Label><Input {...register("company_name")} className="mt-1" /></div>
              <div><Label>Contact Person</Label><Input {...register("contact_person")} className="mt-1" /></div>
              <div><Label>Phone</Label><Input {...register("phone")} className="mt-1" /></div>
              <div><Label>Email</Label><Input type="email" {...register("email")} className="mt-1" /></div>
              <div>
                <Label>Interested Service</Label>
                <NativeSelect {...register("interested_service")} className="mt-1">
                  <option value="">Select service</option>
                  {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                </NativeSelect>
              </div>
              <div>
                <Label>Stage</Label>
                <NativeSelect {...register("stage")} className="mt-1">
                  {STAGES.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
                </NativeSelect>
              </div>
              <div><Label>Expected Budget ($)</Label><Input type="number" {...register("expected_budget")} className="mt-1" /></div>
              <div className="col-span-2"><Label>Notes</Label><Input {...register("notes")} className="mt-1" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Convert to Client Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader><DialogTitle>Convert Lead to Client</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              convertMutation.mutate({
                company_name: fd.get("company_name") as string,
                contact_person: fd.get("contact_person") as string || undefined,
                phone: fd.get("phone") as string || undefined,
                email: fd.get("email") as string || undefined,
                monthly_value: fd.get("monthly_value") ? Number(fd.get("monthly_value")) : undefined,
                service_type: lead.interested_service || undefined,
                status: "active",
              });
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Company Name *</Label>
                <Input name="company_name" defaultValue={lead.company_name ?? lead.lead_name} required className="mt-1" />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input name="contact_person" defaultValue={lead.contact_person ?? ""} className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input name="phone" defaultValue={lead.phone ?? ""} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={lead.email ?? ""} className="mt-1" />
              </div>
              <div className="col-span-2">
                <Label>Monthly Value ($)</Label>
                <Input name="monthly_value" type="number" min="0" step="0.01" defaultValue={lead.expected_budget ?? ""} className="mt-1" placeholder="0.00" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={convertMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {convertMutation.isPending ? "Converting..." : "Convert to Client"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Lead"
        description={`Are you sure you want to delete ${lead.lead_name}? This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
