"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FolderKanban, Calendar, DollarSign, Users, Flag, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import type { Project, Task, Client, Employee, Milestone } from "@/types";
import { format } from "date-fns";
import { useState } from "react";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = parseInt(id);
  const queryClient = useQueryClient();

  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [addingMilestone, setAddingMilestone] = useState(false);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => get("/projects/"),
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => get("/tasks/"),
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => get("/clients/"),
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => get("/employees/"),
  });

  const { data: milestones } = useQuery<Milestone[]>({
    queryKey: ["milestones", projectId],
    queryFn: () => get(`/projects/${projectId}/milestones`),
    enabled: !!projectId,
  });

  const toggleMilestone = useMutation({
    mutationFn: (m: Milestone) =>
      patch(`/projects/${projectId}/milestones/${m.id}`, { is_completed: !m.is_completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });

  const deleteMilestone = useMutation({
    mutationFn: (milestoneId: number) =>
      del(`/projects/${projectId}/milestones/${milestoneId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });

  const createMilestone = useMutation({
    mutationFn: (data: { title: string; due_date?: string }) =>
      post(`/projects/${projectId}/milestones`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
      setNewTitle("");
      setNewDueDate("");
      setAddingMilestone(false);
    },
  });

  const project = (projects ?? []).find((p) => p.id === projectId);
  const projectTasks = (tasks ?? []).filter((t) => t.project_id === projectId);
  const clientMap = Object.fromEntries((clients ?? []).map((c) => [c.id, c.company_name]));
  const employeeMap = Object.fromEntries(
    (employees ?? []).flatMap((e) => [
      [e.user_id ?? e.id, e.full_name],
      [e.id, e.full_name],
    ])
  );

  const statusGroups = ["todo", "in_progress", "review", "done", "cancelled"];
  const tasksByStatus = statusGroups.reduce((acc, status) => {
    acc[status] = projectTasks.filter((t) => t.status === status);
    return acc;
  }, {} as Record<string, Task[]>);

  if (!project && (projects ?? []).length > 0) {
    return (
      <>
        <TopBar title="Project Not Found" />
        <main className="flex-1 p-3 sm:p-6">
          <Button variant="outline" onClick={() => router.push("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
          </Button>
          <p className="mt-4 text-muted-foreground">This project could not be found.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={project?.name ?? "Loading…"} />
      <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6">
        <Button variant="outline" size="sm" onClick={() => router.push("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        {project && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-blue-500" />
                {project.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <StatusBadge value={project.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Priority</p>
                  <StatusBadge value={project.priority} />
                </div>
                {project.client_id && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Client</p>
                    <p className="text-sm font-medium">{clientMap[project.client_id] ?? String(project.client_id)}</p>
                  </div>
                )}
                {project.budget && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" />Budget</p>
                    <p className="text-sm font-medium">${Number(project.budget).toLocaleString()}</p>
                  </div>
                )}
                {project.start_date && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" />Start</p>
                    <p className="text-sm">{format(new Date(project.start_date), "MMM d, yyyy")}</p>
                  </div>
                )}
                {project.due_date && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" />Due</p>
                    <p className="text-sm">{format(new Date(project.due_date), "MMM d, yyyy")}</p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <span className="text-xs font-medium">{project.progress_percent ?? 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${project.progress_percent ?? 0}%` }} />
                </div>
              </div>

              {project.description && (
                <p className="text-sm text-muted-foreground mt-3">{project.description}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Milestones */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold text-sm">Milestones ({milestones?.length ?? 0})</h2>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddingMilestone((v) => !v)}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>

          {addingMilestone && (
            <Card>
              <CardContent className="pt-4 pb-3 px-4 space-y-2">
                <Input
                  placeholder="Milestone title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-sm"
                />
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={!newTitle.trim() || createMilestone.isPending}
                    onClick={() =>
                      createMilestone.mutate({
                        title: newTitle.trim(),
                        ...(newDueDate ? { due_date: newDueDate } : {}),
                      })
                    }
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingMilestone(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!milestones || milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No milestones yet.</p>
          ) : (
            <Card>
              <CardContent className="px-4 py-2 divide-y">
                {milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-2">
                    <button
                      onClick={() => toggleMilestone.mutate(m)}
                      className="shrink-0 text-muted-foreground hover:text-green-600 transition-colors"
                      aria-label={m.is_completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {m.is_completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${m.is_completed ? "line-through text-muted-foreground" : ""}`}>
                        {m.title}
                      </p>
                      {m.due_date && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(m.due_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    {m.is_completed && m.completed_at && (
                      <Badge variant="secondary" className="text-xs shrink-0">Done</Badge>
                    )}
                    <button
                      onClick={() => deleteMilestone.mutate(m.id)}
                      className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                      aria-label="Delete milestone"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tasks by status */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            <h2 className="font-semibold text-sm">Tasks ({projectTasks.length})</h2>
          </div>

          {tasksLoading ? (
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          ) : projectTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks in this project yet.</p>
          ) : (
            statusGroups.map((status) => {
              const group = tasksByStatus[status];
              if (group.length === 0) return null;
              return (
                <Card key={status}>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-xs font-semibold flex items-center gap-2">
                      <StatusBadge value={status} />
                      <span className="text-muted-foreground">({group.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-0">
                    <div className="divide-y">
                      {group.map((t) => (
                        <div key={t.id} className="flex items-center justify-between py-2 gap-3 cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-900/20 rounded-lg px-1 -mx-1 transition-colors" onClick={() => router.push(`/tasks/${t.id}`)}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.title}</p>
                            {t.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {t.assigned_to && (
                              <Badge variant="outline" className="text-xs">
                                {employeeMap[t.assigned_to] ?? `#${t.assigned_to}`}
                              </Badge>
                            )}
                            <StatusBadge value={t.priority} />
                            {t.due_date && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(t.due_date), "MMM d")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
