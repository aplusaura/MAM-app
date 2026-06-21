"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderKanban, CheckSquare, AlertTriangle, Users, User } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Cell,
} from "recharts";
import type { ProjectStats, TaskStats, RevenueMonth, Employee } from "@/types";

const MONTH_NAMES: Record<number, string> = {
  1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",
  7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec",
};

type ReportTab = "overview" | "team" | "employee";

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("overview");
  const [teamMonth, setTeamMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const { data: projectStats } = useQuery<ProjectStats>({
    queryKey: ["reports", "projects"],
    queryFn: () => get("/reports/projects/stats"),
  });

  const { data: taskStats } = useQuery<TaskStats>({
    queryKey: ["reports", "tasks"],
    queryFn: () => get("/reports/tasks/stats"),
  });

  const { data: revenueData } = useQuery<RevenueMonth[]>({
    queryKey: ["revenue", "monthly"],
    queryFn: () => get(`/reports/revenue/monthly?year=${new Date().getFullYear()}`),
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => get("/employees/"),
    staleTime: 60000,
  });

  const [teamYear, teamMonthNum] = teamMonth.split("-").map(Number);

  const { data: teamReport } = useQuery<{
    month: number; year: number;
    total_tasks: number; completed: number; overdue: number;
    total_hours_logged: number; completion_rate: number;
    by_type: Record<string, number>;
  }>({
    queryKey: ["reports", "team", teamYear, teamMonthNum],
    queryFn: () => get(`/reports/team/monthly?month=${teamMonthNum}&year=${teamYear}`),
    enabled: tab === "team",
  });

  const { data: empReport } = useQuery<{
    month: number; year: number; employee_id: number; full_name: string;
    tasks_assigned: number; tasks_completed: number; tasks_overdue: number;
    completion_rate: number; hours_logged: number;
    evaluations: { score: number; evaluation_type: string }[];
  }>({
    queryKey: ["reports", "employee", selectedEmployeeId, teamYear, teamMonthNum],
    queryFn: () => get(`/reports/employee/${selectedEmployeeId}/monthly?month=${teamMonthNum}&year=${teamYear}`),
    enabled: tab === "employee" && selectedEmployeeId !== null,
  });

  const months = (revenueData ?? []).slice(-6);
  const totalRevenue = months.reduce((s, r) => s + r.total, 0);

  // Chart data transforms
  const taskStatusColors: Record<string, string> = {
    todo: "#9ca3af",
    in_progress: "#3b82f6",
    review: "#a855f7",
    done: "#22c55e",
    cancelled: "#ef4444",
  };
  const projectStatusColors: Record<string, string> = {
    planning: "#9ca3af",
    in_progress: "#3b82f6",
    completed: "#22c55e",
    on_hold: "#eab308",
    cancelled: "#ef4444",
  };

  const taskStatusData = Object.entries(taskStats?.by_status ?? {}).map(([status, count]) => ({
    status: status.replace(/_/g, " "),
    rawStatus: status,
    count,
  }));

  const projectStatusData = Object.entries(projectStats?.by_status ?? {}).map(([status, count]) => ({
    status: status.replace(/_/g, " "),
    rawStatus: status,
    count,
  }));

  const revenueChartData = (revenueData ?? []).map((r) => ({
    month: MONTH_NAMES[r.month] ?? String(r.month),
    revenue: Number(r.total),
  }));

  const tabClass = (t: ReportTab) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  return (
    <>
      <TopBar title="Reports & Analytics" />
      <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50 min-h-full">

        {/* Tab nav */}
        <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
          <button onClick={() => setTab("overview")} className={tabClass("overview")}>
            <FolderKanban className="w-3.5 h-3.5 inline mr-1.5" />Overview
          </button>
          <button onClick={() => setTab("team")} className={tabClass("team")}>
            <Users className="w-3.5 h-3.5 inline mr-1.5" />Team Monthly
          </button>
          <button onClick={() => setTab("employee")} className={tabClass("employee")}>
            <User className="w-3.5 h-3.5 inline mr-1.5" />Employee Report
          </button>
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Projects" value={projectStats?.total ?? "—"} icon={FolderKanban} color="blue" />
              <StatCard title="Active Projects" value={projectStats?.by_status?.in_progress ?? "—"} icon={FolderKanban} color="green" />
              <StatCard title="Overdue Tasks" value={taskStats?.overdue ?? "—"} icon={AlertTriangle} color="red" />
              <StatCard title="Total Tasks" value={taskStats?.total ?? "—"} icon={CheckSquare} color="purple" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chart 1: Tasks by Status */}
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasks by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={taskStatusData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tasks">
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`task-${index}`} fill={taskStatusColors[entry.rawStatus] ?? "#9ca3af"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Chart 2: Projects by Status */}
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Projects by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={projectStatusData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Projects">
                        {projectStatusData.map((entry, index) => (
                          <Cell key={`proj-${index}`} fill={projectStatusColors[entry.rawStatus] ?? "#9ca3af"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Chart 3: Monthly Revenue Line Chart */}
              <Card className="md:col-span-2 rounded-xl border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={((value: number) => [`$${Number(value).toLocaleString()}`, "Revenue"]) as never}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#6366f1" }}
                        activeDot={{ r: 6 }}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Progress bar breakdown cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardHeader><CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Projects by Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(projectStats?.by_status ?? {}).map(([status, count]) => {
                      const total = projectStats?.total || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{status.replace(/_/g, " ")}</span>
                            <span className="font-medium">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-gray-100 shadow-sm">
                <CardHeader><CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasks by Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(taskStats?.by_status ?? {}).map(([status, count]) => {
                      const total = taskStats?.total || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{status.replace(/_/g, " ")}</span>
                            <span className="font-medium">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 rounded-xl border-gray-100 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly Revenue (Last 6 Months)</CardTitle>
                    <span className="text-sm font-semibold text-green-700">${totalRevenue.toLocaleString()} total</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue Collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {months.length === 0 ? (
                          <tr><td colSpan={2} className="text-center text-gray-400 text-sm py-8">No revenue data</td></tr>
                        ) : months.map((r) => (
                          <tr key={r.month} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3 text-gray-700">{MONTH_NAMES[r.month] ?? r.month}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">${Number(r.total).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Team Monthly */}
        {tab === "team" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Input type="month" value={teamMonth} onChange={(e) => setTeamMonth(e.target.value)} className="w-44 h-9 text-sm" />
            </div>
            {!teamReport ? (
              <p className="text-sm text-gray-400">Loading report…</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Tasks", value: teamReport.total_tasks, color: "text-gray-700" },
                    { label: "Completed", value: teamReport.completed, color: "text-emerald-600" },
                    { label: "Overdue", value: teamReport.overdue, color: "text-red-600" },
                    { label: "Completion Rate", value: `${Math.round(teamReport.completion_rate * 100)}%`, color: "text-blue-600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 text-center">
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-gray-400 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                {/* Chart 4: Task Breakdown Bar Chart */}
                <Card className="rounded-xl border-gray-100 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold text-gray-500 uppercase">Task Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(teamReport.by_type ?? {}).length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={Object.entries(teamReport.by_type).map(([type, count]) => ({
                            type: type.replace(/_/g, " "),
                            count,
                          }))}
                          barGap={4}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Tasks" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={[
                            { label: "Completed", count: teamReport.completed, fill: "#22c55e" },
                            { label: "Overdue", count: teamReport.overdue, fill: "#ef4444" },
                            { label: "Remaining", count: Math.max(0, teamReport.total_tasks - teamReport.completed - teamReport.overdue), fill: "#9ca3af" },
                          ]}
                          barGap={4}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tasks">
                            {[
                              { label: "Completed", fill: "#22c55e" },
                              { label: "Overdue", fill: "#ef4444" },
                              { label: "Remaining", fill: "#9ca3af" },
                            ].map((entry, index) => (
                              <Cell key={`team-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {Object.keys(teamReport.by_type ?? {}).length > 0 && (
                  <Card className="rounded-xl border-gray-100 shadow-sm">
                    <CardHeader><CardTitle className="text-xs font-semibold text-gray-500 uppercase">Tasks by Type</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(teamReport.by_type).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-sm">
                            <span className="capitalize text-gray-700">{type.replace(/_/g, " ")}</span>
                            <span className="font-semibold text-gray-900">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* Employee Report */}
        {tab === "employee" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                className="h-9 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedEmployeeId ?? ""}
                onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select employee…</option>
                {(employees ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
              <Input type="month" value={teamMonth} onChange={(e) => setTeamMonth(e.target.value)} className="w-44 h-9 text-sm" />
            </div>
            {!selectedEmployeeId ? (
              <p className="text-sm text-gray-400">Select an employee to see their monthly report.</p>
            ) : !empReport ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Assigned", value: empReport.tasks_assigned ?? (empReport as any).total_tasks ?? 0, color: "text-gray-700" },
                    { label: "Completed", value: empReport.tasks_completed ?? (empReport as any).completed ?? 0, color: "text-emerald-600" },
                    { label: "Overdue", value: empReport.tasks_overdue ?? (empReport as any).delayed ?? 0, color: "text-red-600" },
                    { label: "Completion Rate", value: empReport.completion_rate != null ? `${Math.round(empReport.completion_rate * 100)}%` : (empReport as any).total_tasks ? `${Math.round((((empReport as any).completed ?? 0) / (empReport as any).total_tasks) * 100)}%` : "—", color: "text-blue-600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 text-center">
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-gray-400 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                {(empReport.evaluations ?? []).length > 0 && (
                  <Card className="rounded-xl border-gray-100 shadow-sm">
                    <CardHeader><CardTitle className="text-xs font-semibold text-gray-500 uppercase">Evaluations This Month</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(empReport.evaluations ?? []).map((ev, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 capitalize">{ev.evaluation_type} Review</span>
                            <span className={`font-semibold ${ev.score >= 4 ? "text-emerald-600" : ev.score === 3 ? "text-blue-600" : "text-red-600"}`}>
                              {ev.score}/5
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

      </main>
    </>
  );
}
