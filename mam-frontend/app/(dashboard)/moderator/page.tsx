"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { CheckCircle, Eye } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Task } from "@/types";
import { format } from "date-fns";
import { useTranslation } from "@/hooks/useTranslation";

export default function ModeratorPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const router = useRouter();
  const [confirmTarget, setConfirmTarget] = useState<Task | null>(null);

  const { data: queue, isLoading } = useQuery<Task[]>({
    queryKey: ["moderator-queue"],
    queryFn: () => get("/tasks/moderator-queue"),
    refetchInterval: 30000,
  });

  const publishMutation = useMutation({
    mutationFn: (taskId: number) => post(`/tasks/${taskId}/mark-published`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderator-queue"] });
      toast.success("Task marked as published");
    },
    onError: () => toast.error("Failed to publish task"),
  });

  const columns: Column<Task>[] = [
    { key: "task_code", label: "#", render: (row) => <span className="text-xs text-gray-400 font-mono">{row.task_code ?? "—"}</span> },
    { key: "title", label: t("title"), render: (row) => <span className="font-medium text-sm text-gray-800">{row.title}</span> },
    {
      key: "task_type", label: t("type"),
      render: (row) => row.task_type ? <span className="text-xs capitalize text-gray-500">{row.task_type.replace(/_/g, " ")}</span> : "—",
    },
    {
      key: "due_date", label: "Due",
      render: (row) => row.due_date ? format(new Date(row.due_date), "MMM d, yyyy") : "—",
    },
    {
      key: "status", label: t("status"),
      render: (row) => <StatusBadge value={row.status} />,
    },
    {
      key: "actions", label: "",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-gray-500"
            onClick={(e) => { e.stopPropagation(); router.push(`/tasks/${row.id}`); }}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />{t("view")}
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={(e) => { e.stopPropagation(); setConfirmTarget(row); }}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />Publish
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <TopBar title={t("moderator")} />
      <main className="flex-1 p-3 sm:p-6 bg-gray-50 min-h-full">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-800">Tasks Pending Publication</h2>
            {(queue?.length ?? 0) > 0 && (
              <span className="ml-auto h-5 px-2 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center">{queue?.length}</span>
            )}
          </div>
          <DataTable
            columns={columns}
            data={queue ?? []}
            isLoading={isLoading}
            emptyMessage="No tasks in moderator queue."
            onRowClick={(row) => router.push(`/tasks/${row.id}`)}
          />
        </div>
      </main>

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(v) => !v && setConfirmTarget(null)}
        title="Publish Task"
        description={`Mark "${confirmTarget?.title}" as published and done?`}
        onConfirm={() => { if (confirmTarget) { publishMutation.mutate(confirmTarget.id); setConfirmTarget(null); } }}
        loading={publishMutation.isPending}
      />
    </>
  );
}
