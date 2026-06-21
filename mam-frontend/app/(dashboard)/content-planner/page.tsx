"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del, getErrorMessage } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/shared/DataTable";
import { toast } from "sonner";
import { Plus, Calendar, Pencil, Trash2, AlertCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { format, parseISO } from "date-fns";

interface ContentPlan {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ContentPlanForm {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
}

export default function ContentPlannerPage() {
  const qc = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ContentPlanForm>({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
  });

  // Fetch content plans
  const { data: plans, isLoading } = useQuery<ContentPlan[]>({
    queryKey: ["content-plans"],
    queryFn: () => get("/content/plans"),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (body: ContentPlanForm) => post("/content/plans", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-plans"] });
      setForm({ title: "", description: "", start_date: "", end_date: "" });
      setIsCreateOpen(false);
      toast.success("Content plan created");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ContentPlanForm }) =>
      patch(`/content/plans/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-plans"] });
      setEditingId(null);
      setForm({ title: "", description: "", start_date: "", end_date: "" });
      toast.success("Content plan updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/content/plans/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content-plans"] });
      setDeleteId(null);
      toast.success("Content plan deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleCreate = () => {
    if (!form.title.trim() || !form.start_date || !form.end_date) {
      toast.error("Please fill in required fields");
      return;
    }
    createMutation.mutate(form);
  };

  const handleUpdate = () => {
    if (!form.title.trim() || !form.start_date || !form.end_date) {
      toast.error("Please fill in required fields");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    }
  };

  const handleEdit = (plan: ContentPlan) => {
    setEditingId(plan.id);
    setForm({
      title: plan.title,
      description: plan.description || "",
      start_date: plan.start_date.split("T")[0],
      end_date: plan.end_date.split("T")[0],
    });
  };

  const columns: Column<ContentPlan>[] = [
    {
      key: "title",
      label: "Title",
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "start_date",
      label: "Date Range",
      render: (row) => {
        const start = format(parseISO(row.start_date), "MMM d");
        const end = format(parseISO(row.end_date), "MMM d, yyyy");
        return `${start} - ${end}`;
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          row.status === "active" ? "bg-blue-100 text-blue-700" :
          row.status === "completed" ? "bg-green-100 text-green-700" :
          "bg-gray-100 text-gray-700"
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(row)}
            className="h-8"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeleteId(row.id)}
            className="h-8 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <TopBar title="Content Planner" />
      <main className="flex-1 p-3 sm:p-6 space-y-6">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-500" />
              Content Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Plan and track your content across multiple campaigns
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Plan
          </Button>
        </div>

        {/* Content Plans Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading content plans...
              </div>
            ) : !plans || plans.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No content plans yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a new plan to get started
                </p>
              </div>
            ) : (
              <DataTable columns={columns} data={plans} />
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || editingId !== null} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingId(null);
          setForm({ title: "", description: "", start_date: "", end_date: "" });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Content Plan" : "Create New Content Plan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Q2 Social Media Campaign"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the content plan..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1.5"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingId(null);
                  setForm({ title: "", description: "", start_date: "", end_date: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Content Plan"
        message="Are you sure you want to delete this content plan? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </>
  );
}
