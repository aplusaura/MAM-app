"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch, post, getErrorMessage } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Sparkles, AlertTriangle, Users, Search, CheckSquare, TrendingUp, RefreshCw, FileText, Printer, Calculator, MessageCircle, Send, DollarSign, CalendarDays, X, Zap, Brain, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import type { WeeklyReport, WorkloadReport, DelayReport, SearchResult, Employee, Task } from "@/types";

type AITool = "proposal" | "estimator" | "timeline" | "crm" | "financial" | "client-insights";

const priorityColor: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const taskTypeColor: Record<string, string> = {
  video_editing: "bg-purple-100 text-purple-700",
  design: "bg-blue-100 text-blue-700",
  content_writing: "bg-teal-100 text-teal-700",
  shooting: "bg-pink-100 text-pink-700",
  social_media: "bg-indigo-100 text-indigo-700",
};

const SUGGESTED_QUESTIONS = [
  "Which employee has the most overdue tasks?",
  "How is project revenue trending?",
  "Which leads are most likely to convert?",
];

const loadColor: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  overloaded: "bg-red-100 text-red-700",
};

const riskColor: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

const RISK_LABELS: Record<string, string> = {
  due_date_passed: "Due date has passed",
  behind_schedule: "Behind schedule",
  critically_behind: "Critically behind",
  approaching_deadline: "Approaching deadline",
  blocked_tasks: "Has blocked tasks",
  too_many_open_tasks: "Too many open tasks",
};

type CrmSuggestion = { lead_id: number; lead_name: string; action: string; timing: string };

type ClientInsight = { client_id: number; client_name: string; health: string; reason: string; action: string };

const healthColor: Record<string, string> = {
  healthy: "bg-green-100 text-green-700",
  "at-risk": "bg-yellow-100 text-yellow-700",
  churning: "bg-red-100 text-red-700",
};

function ClientInsightsCard() {
  const [insights, setInsights] = useState<ClientInsight[] | null>(null);

  const mutation = useMutation({
    mutationFn: () => get("/ai/client-insights") as Promise<ClientInsight[]>,
    onSuccess: (data) => { setInsights(Array.isArray(data) ? data : []); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-violet-500" />
          Client Insights
          <span className="text-xs text-muted-foreground font-normal ml-2">AI health analysis for each client</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={() => { setInsights(null); mutation.mutate(); }}
          disabled={mutation.isPending}
          className="gap-1.5"
        >
          <Sparkles className="h-4 w-4" />
          {mutation.isPending ? "Analyzing…" : "Analyze Clients"}
        </Button>

        {mutation.isPending && (
          <p className="text-sm text-muted-foreground">Analyzing client health...</p>
        )}

        {insights && insights.length === 0 && (
          <p className="text-sm text-muted-foreground">No clients found to analyze.</p>
        )}

        {insights && insights.length > 0 && (
          <div className="space-y-2">
            {insights.map((s) => (
              <div key={s.client_id} className="p-3 rounded-lg border bg-gray-50 space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium">{s.client_name}</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${healthColor[s.health] ?? "bg-gray-100 text-gray-700"}`}>
                    {s.health}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{s.reason}</p>
                <p className="text-xs text-blue-700 font-medium">Action: {s.action}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CrmFollowupCard() {
  const [suggestions, setSuggestions] = useState<CrmSuggestion[] | null>(null);

  const mutation = useMutation({
    mutationFn: () => post("/ai/crm-followup", {}) as Promise<CrmSuggestion[]>,
    onSuccess: (data) => { setSuggestions(Array.isArray(data) ? data : []); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-rose-500" />
          CRM Follow-up Suggestions
          <span className="text-xs text-muted-foreground font-normal ml-2">AI-suggested actions for your top leads</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={() => { setSuggestions(null); mutation.mutate(); }}
          disabled={mutation.isPending}
          className="gap-1.5"
        >
          <Sparkles className="h-4 w-4" />
          {mutation.isPending ? "Generating…" : "Generate Follow-ups"}
        </Button>

        {mutation.isPending && (
          <p className="text-sm text-muted-foreground">Analyzing leads...</p>
        )}

        {suggestions && suggestions.length === 0 && (
          <p className="text-sm text-muted-foreground">No leads found to analyze.</p>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.lead_id} className="p-3 rounded-lg border bg-gray-50 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.lead_name}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{s.action}</p>
                </div>
                <span className="shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-100 text-rose-700">
                  {s.timing}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const AI_TOOLS = [
  { id: "proposal", name: "Proposal Builder", icon: FileText, color: "indigo", description: "AI-generated client proposal" },
  { id: "estimator", name: "Project Estimator", icon: Calculator, color: "emerald", description: "AI-powered project scoping" },
  { id: "timeline", name: "Timeline Generator", icon: CalendarDays, color: "violet", description: "AI-generated project phases" },
  { id: "crm", name: "CRM Follow-up", icon: Zap, color: "rose", description: "AI-suggested lead actions" },
  { id: "financial", name: "Financial Insights", icon: TrendingDown, color: "green", description: "AI-powered finance analysis" },
  { id: "client-insights", name: "Client Insights", icon: Brain, color: "blue", description: "AI health analysis for clients" },
] as const;

export default function AIPage() {
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [pendingReassign, setPendingReassign] = useState<{ taskId: number; taskTitle: string; employeeId: number; employeeName: string } | null>(null);
  const [proposalForm, setProposalForm] = useState({
    client_name: "", service: "", scope: "", timeline: "", budget: "",
  });
  const [generatedProposal, setGeneratedProposal] = useState<string | null>(null);

  // Project Estimator state
  const [estimatorForm, setEstimatorForm] = useState({
    brief: "", service_type: "", budget: "", timeline: "",
  });
  type EstimateTask = { title: string; type: string; hours: number; priority: string; description: string };
  type EstimateResult = {
    summary: string;
    estimated_hours: number;
    estimated_cost: number;
    tasks: EstimateTask[];
    timeline_weeks: number;
    risks: string[];
    recommendations: string[];
  };
  const [estimateResult, setEstimateResult] = useState<EstimateResult | null>(null);

  // Chat with Data state
  type ChatMessage = { role: "user" | "assistant"; text: string };
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<CrmSuggestion[] | null>(null);
  const [insights, setInsights] = useState<ClientInsight[] | null>(null);
  const qc = useQueryClient();
  const { user, hasPermission } = useAuthStore();

  // Only superusers, team leaders, and account managers can override assignments
  const canOverride = user?.is_superuser || hasPermission("edit_tasks");

  const { data: weekly, isLoading: loadingWeekly } = useQuery<WeeklyReport>({
    queryKey: ["ai", "weekly-report"],
    queryFn: () => get("/ai/weekly-report"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: workload, isLoading: loadingWorkload } = useQuery<WorkloadReport>({
    queryKey: ["ai", "workload"],
    queryFn: () => get("/ai/workload"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: delays, isLoading: loadingDelays } = useQuery<DelayReport>({
    queryKey: ["ai", "delays"],
    queryFn: () => get("/ai/delays"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: searchResults, isLoading: loadingSearch } = useQuery<SearchResult[]>({
    queryKey: ["ai", "search", submittedQuery],
    queryFn: () => get(`/ai/search?q=${encodeURIComponent(submittedQuery)}`),
    enabled: submittedQuery.length >= 2,
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => get("/employees/"),
    enabled: canOverride,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => get("/tasks/"),
    enabled: canOverride,
  });

  const reassignMutation = useMutation({
    mutationFn: ({ taskId, employeeId }: { taskId: number; employeeId: number }) =>
      patch(`/tasks/${taskId}`, { assigned_to: employeeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["ai", "workload"] });
      toast.success("Task reassigned");
    },
    onError: () => toast.error("Failed to reassign task"),
  });

  const proposalMutation = useMutation({
    mutationFn: (body: object) => post("/ai/generate-proposal", body) as Promise<{ proposal: string }>,
    onSuccess: (data) => { setGeneratedProposal(data.proposal); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const estimatorMutation = useMutation({
    mutationFn: (body: object) => post("/ai/estimate-project", body) as Promise<EstimateResult>,
    onSuccess: (data) => { setEstimateResult(data); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const chatMutation = useMutation({
    mutationFn: (body: object) => post("/ai/chat", body) as Promise<{ answer: string }>,
    onSuccess: (data) => {
      setChatMessages((prev) => [...prev, { role: "assistant" as const, text: data.answer }].slice(-20));
    },
    onError: (e) => {
      setChatMessages((prev) => [...prev, { role: "assistant" as const, text: `Error: ${getErrorMessage(e)}` }].slice(-20));
    },
  });

  const handleChatSend = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setChatMessages((prev) => [...prev, { role: "user" as const, text: q }].slice(-20));
    setChatInput("");
    chatMutation.mutate({ question: q });
  };

  // Timeline Generator state
  const [timelineForm, setTimelineForm] = useState({
    project_name: "", deliverables: "", team_size: 3, deadline: "",
  });
  type TimelinePhase = { name: string; duration_weeks: number; tasks: string[]; dependencies: string[] };
  type TimelineResult = { phases: TimelinePhase[]; total_weeks: number; risks: string[] };
  const [timelineResult, setTimelineResult] = useState<TimelineResult | null>(null);
  const timelineMutation = useMutation({
    mutationFn: (body: object) => post("/ai/generate-timeline", body) as Promise<TimelineResult>,
    onSuccess: (data) => { setTimelineResult(data); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  type FinancialInsight = { insight: string; recommendation: string; priority: string };
  const [financialInsights, setFinancialInsights] = useState<FinancialInsight[] | null>(null);
  const financialMutation = useMutation({
    mutationFn: () => get("/ai/financial-insights") as Promise<FinancialInsight[]>,
    onSuccess: (data) => { setFinancialInsights(Array.isArray(data) ? data : []); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const clientMutation = useMutation({
    mutationFn: () => get("/ai/client-insights") as Promise<ClientInsight[]>,
    onSuccess: (data) => { setInsights(Array.isArray(data) ? data : []); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // Tasks that are assigned (in_progress or todo) for override panel
  const assignedTasks = (tasks ?? []).filter((t) => ["todo", "in_progress"].includes(t.status) && t.assigned_to);
  const employeeMap = Object.fromEntries((employees ?? []).flatMap((e) => [
    [e.id, e.full_name],
    ...(e.user_id ? [[e.user_id, e.full_name]] : []),
  ]));

  return (
    <>
      <TopBar title="AI Features" />
      <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6">

        {/* Tool Selector Grid - PROMINENT AT TOP */}
        <div className="mb-2">
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-2xl font-bold text-gray-900">AI Tools</h2>
            <p className="text-sm text-gray-500">Select a tool to get started</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {AI_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const colorMap: Record<string, string> = {
                indigo: "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300 hover:shadow-lg",
                emerald: "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-lg",
                violet: "bg-violet-50 border-violet-200 text-violet-600 hover:bg-violet-100 hover:border-violet-300 hover:shadow-lg",
                rose: "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300 hover:shadow-lg",
                green: "bg-green-50 border-green-200 text-green-600 hover:bg-green-100 hover:border-green-300 hover:shadow-lg",
                blue: "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 hover:shadow-lg",
              };
              return (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id as AITool)}
                  className={`p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-3 active:scale-95 ${colorMap[tool.color] || colorMap.indigo}`}
                >
                  <Icon className="h-7 w-7" />
                  <div className="text-center">
                    <p className="text-sm font-bold leading-tight">{tool.name}</p>
                    <p className="text-[11px] opacity-70 mt-1">{tool.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Smart Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-blue-500" />
              Smart Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Search clients, projects, tasks, leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setSubmittedQuery(searchQuery)}
                className="max-w-md"
              />
              <Button onClick={() => setSubmittedQuery(searchQuery)} disabled={searchQuery.length < 2}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {loadingSearch && <p className="text-sm text-muted-foreground mt-3">Searching...</p>}
            {searchResults && (
              <div className="mt-3 space-y-2">
                {searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No results found.</p>
                ) : searchResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-white">
                    <Badge variant="outline" className="shrink-0 text-xs capitalize">{r.type}</Badge>
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      {r.subtitle && <p className="text-xs text-muted-foreground">{r.subtitle}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Stats Section Header */}
        <div className="mt-8 mb-2">
          <h2 className="text-xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-sm text-gray-500">Weekly metrics and team insights</p>
        </div>

        {/* Client Health Analysis */}
        <ClientInsightsCard />

        {/* Weekly Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Weekly Report
              {weekly && (
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  {weekly.period.from} → {weekly.period.to}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingWeekly ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : weekly ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard title="Tasks Done" value={weekly.tasks.completed_this_week} icon={CheckSquare} color="green" />
                <StatCard title="Overdue Tasks" value={weekly.tasks.currently_overdue} icon={AlertTriangle} color="red" />
                <StatCard title="Active Projects" value={weekly.projects.active} icon={TrendingUp} color="blue" />
                <StatCard title="Projects Done" value={weekly.projects.completed_this_week} icon={CheckSquare} color="purple" />
                <StatCard title="Invoices" value={weekly.finance.invoices_issued_this_week ?? weekly.finance.invoices_sent ?? 0} icon={Sparkles} color="yellow" />
                <StatCard title="Revenue" value={`$${Number(weekly.finance.payments_received ?? weekly.finance.revenue_this_week ?? 0).toLocaleString()}`} icon={TrendingUp} color="green" />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Workload Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-blue-500" />
                Workload Distribution
                {workload && (
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    {workload.summary.total_active_employees} employees
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWorkload ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : !workload?.employee_loads?.length ? (
                <p className="text-sm text-muted-foreground">No workload data.</p>
              ) : (
                <div className="space-y-3">
                  {workload.employee_loads.map((w) => (
                    <div key={w.employee_id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{w.full_name}</p>
                        <p className="text-xs text-muted-foreground">{w.open_task_count} open tasks</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${loadColor[w.load_level] ?? ""}`}>
                        {w.load_level}
                      </span>
                    </div>
                  ))}
                  {workload.suggestions?.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions</p>
                      {workload.suggestions.map((s: string | { suggestion?: string; task_title?: string; [key: string]: unknown }, i: number) => (
                        <p key={i} className="text-xs text-gray-600 py-0.5">• {typeof s === "string" ? s : (s.suggestion ?? s.task_title ?? JSON.stringify(s))}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expected Delays */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Expected Delays
                {delays?.summary && (
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    {delays.summary.projects_at_risk} at risk, {delays.summary.overdue_tasks_count} overdue
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingDelays ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  {(!delays?.at_risk_projects?.length && !delays?.overdue_tasks?.length) && (
                    <p className="text-sm text-green-600">No delays detected!</p>
                  )}
                  {(delays?.at_risk_projects ?? []).map((p) => (
                    <div key={p.project_id} className="p-3 rounded-lg border border-orange-100 bg-orange-50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">{p.project_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${riskColor[p.risk_level] ?? ""}`}>{p.risk_level} risk</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Due {p.due_date} • {p.progress_percent}% done</p>
                      {p.risk_factors?.map((rf, i) => (
                        <p key={i} className="text-xs text-orange-700 mt-1">• {RISK_LABELS[rf] ?? rf}</p>
                      ))}
                    </div>
                  ))}
                  {(delays?.overdue_tasks ?? []).map((t) => (
                    <div key={t.id} className="p-3 rounded-lg border border-red-100 bg-red-50">
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-red-600 font-medium mt-1">{t.days_overdue} days overdue</p>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tool Sections - Bottom of Page */}
        <div className="mt-8 mb-2">
          <h2 className="text-xl font-bold text-gray-900">Tool Details & Results</h2>
          <p className="text-sm text-gray-500">Expanded tool interfaces and outputs</p>
        </div>

        {/* Proposal Builder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-indigo-500" />
              Proposal Builder
              <span className="text-xs text-muted-foreground font-normal ml-2">AI-generated client proposal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "client_name", label: "Client Name", placeholder: "e.g. Acme Corp" },
                { key: "service", label: "Service", placeholder: "e.g. Social Media Management" },
                { key: "timeline", label: "Timeline", placeholder: "e.g. 3 months" },
                { key: "budget", label: "Budget", placeholder: "e.g. $5,000/month" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <Input
                    placeholder={placeholder}
                    className="text-sm"
                    value={proposalForm[key as keyof typeof proposalForm]}
                    onChange={(e) => setProposalForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Scope of Work</label>
                <Textarea
                  rows={3}
                  placeholder="Describe the scope of work…"
                  className="text-sm resize-none"
                  value={proposalForm.scope}
                  onChange={(e) => setProposalForm(f => ({ ...f, scope: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={() => { setGeneratedProposal(null); proposalMutation.mutate(proposalForm); }}
              disabled={!proposalForm.client_name || !proposalForm.service || proposalMutation.isPending}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              {proposalMutation.isPending ? "Generating…" : "Generate Proposal"}
            </Button>

            {generatedProposal && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Generated Proposal</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(generatedProposal);
                      toast.success("Copied to clipboard");
                    }}>
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                      const win = window.open("", "_blank");
                      if (!win) { toast.error("Allow popups to download PDF"); return; }
                      win.document.write(`<!DOCTYPE html><html><head>
                        <title>Proposal – ${proposalForm.client_name}</title>
                        <style>
                          body{font-family:Arial,sans-serif;padding:48px;max-width:760px;margin:0 auto;color:#1a1a2e}
                          h1{font-size:22px;color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:8px;margin-bottom:4px}
                          .meta{color:#555;font-size:13px;margin-bottom:24px}
                          pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#222}
                          @media print{body{padding:24px}button{display:none}}
                        </style>
                      </head><body>
                        <h1>Proposal for ${proposalForm.client_name}</h1>
                        <div class="meta">Service: ${proposalForm.service} &nbsp;|&nbsp; Timeline: ${proposalForm.timeline} &nbsp;|&nbsp; Budget: ${proposalForm.budget || "TBD"}</div>
                        <pre>${generatedProposal.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
                      </body></html>`);
                      win.document.close();
                      setTimeout(() => win.print(), 400);
                    }}>
                      <Printer className="h-3.5 w-3.5" />
                      Download PDF
                    </Button>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 max-h-[500px] overflow-y-auto">
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{generatedProposal}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Estimator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-emerald-500" />
              Project Estimator
              <span className="text-xs text-muted-foreground font-normal ml-2">AI-powered project scoping and cost estimation</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Client Brief</label>
                <Textarea
                  rows={3}
                  placeholder="Describe what the client needs..."
                  className="text-sm resize-none"
                  value={estimatorForm.brief}
                  onChange={(e) => setEstimatorForm((f) => ({ ...f, brief: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Service Type</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={estimatorForm.service_type}
                  onChange={(e) => setEstimatorForm((f) => ({ ...f, service_type: e.target.value }))}
                >
                  <option value="">Select a service...</option>
                  <option value="Video Production">Video Production</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Photography">Photography</option>
                  <option value="Design">Design</option>
                  <option value="Content Writing">Content Writing</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Budget (optional)</label>
                <Input
                  placeholder="e.g. $10,000"
                  className="text-sm"
                  value={estimatorForm.budget}
                  onChange={(e) => setEstimatorForm((f) => ({ ...f, budget: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Timeline (optional)</label>
                <Input
                  placeholder="e.g. 6 weeks"
                  className="text-sm"
                  value={estimatorForm.timeline}
                  onChange={(e) => setEstimatorForm((f) => ({ ...f, timeline: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={() => { setEstimateResult(null); estimatorMutation.mutate(estimatorForm); }}
              disabled={!estimatorForm.brief || !estimatorForm.service_type || estimatorMutation.isPending}
              className="gap-1.5"
            >
              <Calculator className="h-4 w-4" />
              {estimatorMutation.isPending ? "Analyzing brief..." : "Estimate Project"}
            </Button>

            {estimateResult && (
              <div className="mt-4 space-y-4">
                {/* Summary */}
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-sm text-emerald-800">{estimateResult.summary}</p>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-gray-50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Estimated Hours</p>
                    <p className="text-xl font-bold text-gray-800">{estimateResult.estimated_hours}h</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-gray-50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Estimated Cost</p>
                    <p className="text-xl font-bold text-gray-800">${estimateResult.estimated_cost.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-gray-50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Timeline</p>
                    <p className="text-xl font-bold text-gray-800">{estimateResult.timeline_weeks}w</p>
                  </div>
                </div>

                {/* Tasks */}
                {estimateResult.tasks?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Tasks</p>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Task</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Type</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Hours</th>
                            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estimateResult.tasks.map((task, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <p className="font-medium text-gray-800">{task.title}</p>
                                {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${taskTypeColor[task.type] ?? "bg-gray-100 text-gray-700"}`}>
                                  {task.type.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-medium">{task.hours}h</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priorityColor[task.priority] ?? ""}`}>
                                  {task.priority}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Risks and Recommendations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {estimateResult.risks?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Risks</p>
                      <ul className="space-y-1">
                        {estimateResult.risks.map((r, i) => (
                          <li key={i} className="text-xs text-orange-700 flex gap-1.5">
                            <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {estimateResult.recommendations?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Recommendations</p>
                      <ul className="space-y-1">
                        {estimateResult.recommendations.map((r, i) => (
                          <li key={i} className="text-xs text-blue-700 flex gap-1.5">
                            <Sparkles className="h-3 w-3 shrink-0 mt-0.5" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <Button variant="outline" className="gap-1.5" onClick={() => toast.info("Task import coming soon")}>
                  <CheckSquare className="h-4 w-4" />
                  Add Tasks to Project
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat with Your Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4 text-sky-500" />
              Ask Your Data
              <span className="text-xs text-muted-foreground font-normal ml-2">Chat with your agency data in real time</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Suggested questions */}
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleChatSend(q)}
                  disabled={chatMutation.isPending}
                  className="text-xs px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Messages */}
            {chatMessages.length > 0 && (
              <div className="rounded-lg border bg-gray-50 p-3 space-y-3 max-h-80 overflow-y-auto">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white rounded-br-sm"
                          : "bg-white border text-gray-800 rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-white border rounded-xl rounded-bl-sm px-3 py-2 text-sm text-muted-foreground">
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask anything about your agency..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !chatMutation.isPending && handleChatSend(chatInput)}
                className="text-sm"
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={() => handleChatSend(chatInput)}
                disabled={!chatInput.trim() || chatMutation.isPending}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Financial Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Financial Insights
              <span className="text-xs text-muted-foreground font-normal ml-2">AI-powered analysis of your agency finances</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => { setFinancialInsights(null); financialMutation.mutate(); }}
              disabled={financialMutation.isPending}
              className="gap-1.5"
            >
              <DollarSign className="h-4 w-4" />
              {financialMutation.isPending ? "Analyzing Finances..." : "Analyze Finances"}
            </Button>
            {financialMutation.isPending && (
              <p className="text-sm text-muted-foreground">Crunching numbers...</p>
            )}
            {financialInsights && financialInsights.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                {financialInsights.map((item, i) => (
                  <div key={i} className="rounded-lg border bg-gray-50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${priorityColor[item.priority] ?? "bg-gray-100 text-gray-700"}`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{item.insight}</p>
                    <p className="text-xs text-muted-foreground">{item.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
            {financialInsights && financialInsights.length === 0 && (
              <p className="text-sm text-muted-foreground">No insights returned. Try again.</p>
            )}
          </CardContent>
        </Card>

        {/* Timeline Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-violet-500" />
              Timeline Generator
              <span className="text-xs text-muted-foreground font-normal ml-2">AI-generated project phase timeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Project Name</label>
                <Input
                  placeholder="e.g. Brand Campaign Q3"
                  className="text-sm"
                  value={timelineForm.project_name}
                  onChange={(e) => setTimelineForm((f) => ({ ...f, project_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Deadline (optional)</label>
                <Input
                  placeholder="e.g. June 30, 2025"
                  className="text-sm"
                  value={timelineForm.deadline}
                  onChange={(e) => setTimelineForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Team Size</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="3"
                  className="text-sm"
                  value={timelineForm.team_size}
                  onChange={(e) => setTimelineForm((f) => ({ ...f, team_size: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Deliverables</label>
                <Textarea
                  rows={3}
                  placeholder="Describe the deliverables and scope…"
                  className="text-sm resize-none"
                  value={timelineForm.deliverables}
                  onChange={(e) => setTimelineForm((f) => ({ ...f, deliverables: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={() => { setTimelineResult(null); timelineMutation.mutate(timelineForm); }}
              disabled={!timelineForm.project_name || !timelineForm.deliverables || timelineMutation.isPending}
              className="gap-1.5"
            >
              <CalendarDays className="h-4 w-4" />
              {timelineMutation.isPending ? "Generating…" : "Generate Timeline"}
            </Button>

            {timelineMutation.isPending && (
              <p className="text-sm text-muted-foreground">Building your project timeline...</p>
            )}

            {timelineResult && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">Total Duration:</span>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-700">
                    {timelineResult.total_weeks} week{timelineResult.total_weeks !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Vertical timeline */}
                <div className="relative pl-6 space-y-0">
                  {timelineResult.phases.map((phase, i) => (
                    <div key={i} className="relative pb-6 last:pb-0">
                      {/* connector line */}
                      {i < timelineResult.phases.length - 1 && (
                        <span className="absolute left-[-13px] top-4 bottom-0 w-0.5 bg-violet-200" />
                      )}
                      {/* dot */}
                      <span className="absolute left-[-18px] top-1.5 h-3 w-3 rounded-full bg-violet-500 border-2 border-white ring-1 ring-violet-300" />

                      <div className="p-3 rounded-lg border bg-gray-50">
                        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                          <p className="text-sm font-semibold text-gray-800">{phase.name}</p>
                          <span className="text-xs text-violet-600 font-medium">
                            {phase.duration_weeks}w
                          </span>
                        </div>
                        {phase.dependencies?.length > 0 && (
                          <p className="text-xs text-muted-foreground mb-1.5">
                            Depends on: {phase.dependencies.join(", ")}
                          </p>
                        )}
                        {phase.tasks?.length > 0 && (
                          <ul className="space-y-0.5">
                            {phase.tasks.map((task, j) => (
                              <li key={j} className="text-xs text-gray-600 flex gap-1.5">
                                <CheckSquare className="h-3 w-3 shrink-0 mt-0.5 text-violet-400" />
                                {task}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Risks */}
                {timelineResult.risks?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Risks</p>
                    <ul className="space-y-1">
                      {timelineResult.risks.map((r, i) => (
                        <li key={i} className="text-xs text-orange-700 flex gap-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CRM Follow-up Suggestions */}
        <CrmFollowupCard />

        {/* Task Assignment Override — only for admins/team leaders */}
        {canOverride && assignedTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                Override Task Assignments
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  Reassign tasks assigned by AI or team members
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assignedTasks.slice(0, 15).map((task) => (
                  <div key={task.id} className="rounded-lg border bg-gray-50 dark:bg-gray-800/60 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Currently: <span className="font-medium">{employeeMap[task.assigned_to!] ?? "Unknown"}</span>
                          {task.task_type && ` · ${task.task_type.replace(/_/g, " ")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <NativeSelect
                          className="text-xs h-8 w-40"
                          defaultValue={String(task.assigned_to)}
                          onChange={(e) => {
                            const newId = parseInt(e.target.value);
                            const emp = (employees ?? []).find((x) => x.id === newId);
                            if (newId && newId !== task.assigned_to && emp) {
                              setPendingReassign({ taskId: task.id, taskTitle: task.title, employeeId: newId, employeeName: emp.full_name });
                            }
                          }}
                        >
                          {(employees ?? []).filter((e) => e.status === "active").map((e) => (
                            <option key={e.id} value={String(e.id)}>{e.full_name}</option>
                          ))}
                        </NativeSelect>
                      </div>
                    </div>
                    {pendingReassign?.taskId === task.id && (
                      <div className="px-3 pb-3 flex items-center gap-2">
                        <p className="text-xs text-amber-700 flex-1">Reassign to <strong>{pendingReassign.employeeName}</strong>?</p>
                        <Button size="sm" className="h-7 text-xs" onClick={() => { reassignMutation.mutate({ taskId: pendingReassign.taskId, employeeId: pendingReassign.employeeId }); setPendingReassign(null); }}>Confirm</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPendingReassign(null)}>Cancel</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tool Modal Dialog */}
        <Dialog open={!!selectedTool} onOpenChange={(open) => !open && setSelectedTool(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTool && AI_TOOLS.find(t => t.id === selectedTool) && (() => {
                  const tool = AI_TOOLS.find(t => t.id === selectedTool)!;
                  const Icon = tool.icon;
                  return <><Icon className="h-5 w-5" /> {tool.name}</>;
                })()}
                <button onClick={() => setSelectedTool(null)} className="ml-auto">
                  <X className="h-4 w-4" />
                </button>
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {/* Proposal Builder */}
              {selectedTool === "proposal" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: "client_name", label: "Client Name", placeholder: "e.g. Acme Corp" },
                      { key: "service", label: "Service", placeholder: "e.g. Social Media Management" },
                      { key: "timeline", label: "Timeline", placeholder: "e.g. 3 months" },
                      { key: "budget", label: "Budget", placeholder: "e.g. $5,000/month" },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                        <Input
                          placeholder={placeholder}
                          className="text-sm"
                          value={proposalForm[key as keyof typeof proposalForm]}
                          onChange={(e) => setProposalForm(f => ({ ...f, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Scope of Work</label>
                      <Textarea
                        rows={3}
                        placeholder="Describe the scope of work…"
                        className="text-sm resize-none"
                        value={proposalForm.scope}
                        onChange={(e) => setProposalForm(f => ({ ...f, scope: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => { setGeneratedProposal(null); proposalMutation.mutate(proposalForm); }}
                    disabled={!proposalForm.client_name || !proposalForm.service || proposalMutation.isPending}
                    className="gap-1.5"
                  >
                    <Sparkles className="h-4 w-4" />
                    {proposalMutation.isPending ? "Generating…" : "Generate Proposal"}
                  </Button>

                  {generatedProposal && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Generated Proposal</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            navigator.clipboard.writeText(generatedProposal);
                            toast.success("Copied to clipboard");
                          }}>
                            Copy
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                            const win = window.open("", "_blank");
                            if (!win) { toast.error("Allow popups to download PDF"); return; }
                            win.document.write(`<!DOCTYPE html><html><head>
                              <title>Proposal – ${proposalForm.client_name}</title>
                              <style>
                                body{font-family:Arial,sans-serif;padding:48px;max-width:760px;margin:0 auto;color:#1a1a2e}
                                h1{font-size:22px;color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:8px;margin-bottom:4px}
                                .meta{color:#555;font-size:13px;margin-bottom:24px}
                                pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#222}
                                @media print{body{padding:24px}button{display:none}}
                              </style>
                            </head><body>
                              <h1>Proposal for ${proposalForm.client_name}</h1>
                              <div class="meta">Service: ${proposalForm.service} &nbsp;|&nbsp; Timeline: ${proposalForm.timeline} &nbsp;|&nbsp; Budget: ${proposalForm.budget || "TBD"}</div>
                              <pre>${generatedProposal.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
                            </body></html>`);
                            win.document.close();
                            setTimeout(() => win.print(), 400);
                          }}>
                            <Printer className="h-3.5 w-3.5" />
                            Download PDF
                          </Button>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 max-h-[300px] overflow-y-auto">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{generatedProposal}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Project Estimator */}
              {selectedTool === "estimator" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Client Brief</label>
                      <Textarea
                        rows={3}
                        placeholder="Describe what the client needs..."
                        className="text-sm resize-none"
                        value={estimatorForm.brief}
                        onChange={(e) => setEstimatorForm((f) => ({ ...f, brief: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Service Type</label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={estimatorForm.service_type}
                        onChange={(e) => setEstimatorForm((f) => ({ ...f, service_type: e.target.value }))}
                      >
                        <option value="">Select a service...</option>
                        <option value="Video Production">Video Production</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Photography">Photography</option>
                        <option value="Design">Design</option>
                        <option value="Content Writing">Content Writing</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Budget (optional)</label>
                      <Input
                        placeholder="e.g. $10,000"
                        className="text-sm"
                        value={estimatorForm.budget}
                        onChange={(e) => setEstimatorForm((f) => ({ ...f, budget: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Timeline (optional)</label>
                      <Input
                        placeholder="e.g. 6 weeks"
                        className="text-sm"
                        value={estimatorForm.timeline}
                        onChange={(e) => setEstimatorForm((f) => ({ ...f, timeline: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => { setEstimateResult(null); estimatorMutation.mutate(estimatorForm); }}
                    disabled={!estimatorForm.brief || !estimatorForm.service_type || estimatorMutation.isPending}
                    className="gap-1.5"
                  >
                    <Calculator className="h-4 w-4" />
                    {estimatorMutation.isPending ? "Analyzing brief..." : "Estimate Project"}
                  </Button>

                  {estimateResult && (
                    <div className="mt-4 space-y-4">
                      <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                        <p className="text-sm text-emerald-800">{estimateResult.summary}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg border bg-gray-50 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Estimated Hours</p>
                          <p className="text-xl font-bold text-gray-800">{estimateResult.estimated_hours}h</p>
                        </div>
                        <div className="p-3 rounded-lg border bg-gray-50 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Estimated Cost</p>
                          <p className="text-xl font-bold text-gray-800">${estimateResult.estimated_cost.toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-lg border bg-gray-50 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Timeline</p>
                          <p className="text-xl font-bold text-gray-800">{estimateResult.timeline_weeks}w</p>
                        </div>
                      </div>
                      {estimateResult.tasks?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Tasks</p>
                          <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b sticky top-0">
                                <tr>
                                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Task</th>
                                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Type</th>
                                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Hours</th>
                                </tr>
                              </thead>
                              <tbody>
                                {estimateResult.tasks.map((task, i) => (
                                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                      <p className="font-medium text-gray-800 text-xs">{task.title}</p>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${taskTypeColor[task.type] ?? "bg-gray-100 text-gray-700"}`}>
                                        {task.type.replace(/_/g, " ")}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium text-xs">{task.hours}h</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Generator */}
              {selectedTool === "timeline" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Project Name</label>
                      <Input
                        placeholder="e.g. Brand Campaign Q3"
                        className="text-sm"
                        value={timelineForm.project_name}
                        onChange={(e) => setTimelineForm((f) => ({ ...f, project_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Deadline (optional)</label>
                      <Input
                        placeholder="e.g. June 30, 2025"
                        className="text-sm"
                        value={timelineForm.deadline}
                        onChange={(e) => setTimelineForm((f) => ({ ...f, deadline: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Team Size</label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="3"
                        className="text-sm"
                        value={timelineForm.team_size}
                        onChange={(e) => setTimelineForm((f) => ({ ...f, team_size: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Deliverables</label>
                      <Textarea
                        rows={3}
                        placeholder="Describe the deliverables and scope…"
                        className="text-sm resize-none"
                        value={timelineForm.deliverables}
                        onChange={(e) => setTimelineForm((f) => ({ ...f, deliverables: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => { setTimelineResult(null); timelineMutation.mutate(timelineForm); }}
                    disabled={!timelineForm.project_name || !timelineForm.deliverables || timelineMutation.isPending}
                    className="gap-1.5"
                  >
                    <CalendarDays className="h-4 w-4" />
                    {timelineMutation.isPending ? "Generating…" : "Generate Timeline"}
                  </Button>

                  {timelineResult && (
                    <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700">Total Duration:</span>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-700">
                          {timelineResult.total_weeks} week{timelineResult.total_weeks !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="relative pl-6 space-y-0">
                        {timelineResult.phases.map((phase, i) => (
                          <div key={i} className="relative pb-6 last:pb-0">
                            {i < timelineResult.phases.length - 1 && (
                              <span className="absolute left-[-13px] top-4 bottom-0 w-0.5 bg-violet-200" />
                            )}
                            <span className="absolute left-[-18px] top-1.5 h-3 w-3 rounded-full bg-violet-500 border-2 border-white ring-1 ring-violet-300" />
                            <div className="p-3 rounded-lg border bg-gray-50">
                              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                                <p className="text-sm font-semibold text-gray-800">{phase.name}</p>
                                <span className="text-xs text-violet-600 font-medium">{phase.duration_weeks}w</span>
                              </div>
                              {phase.tasks?.length > 0 && (
                                <ul className="space-y-0.5">
                                  {phase.tasks.map((task, j) => (
                                    <li key={j} className="text-xs text-gray-600 flex gap-1.5">
                                      <CheckSquare className="h-3 w-3 shrink-0 mt-0.5 text-violet-400" />
                                      {task}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CRM Follow-up */}
              {selectedTool === "crm" && (
                <div className="space-y-4">
                  <Button
                    onClick={() => post("/ai/crm-followup", {}).then(data => setSuggestions(Array.isArray(data) ? data : [])).catch(() => toast.error("Failed to generate follow-ups"))}
                    disabled={false}
                    className="gap-1.5"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate Follow-ups
                  </Button>
                  {/* Suggestions will be shown after generation - simplified for brevity */}
                </div>
              )}

              {/* Financial Insights */}
              {selectedTool === "financial" && (
                <div className="space-y-4">
                  <Button
                    onClick={() => { setFinancialInsights(null); financialMutation.mutate(); }}
                    disabled={financialMutation.isPending}
                    className="gap-1.5"
                  >
                    <DollarSign className="h-4 w-4" />
                    {financialMutation.isPending ? "Analyzing Finances..." : "Analyze Finances"}
                  </Button>
                  {financialMutation.isPending && (
                    <p className="text-sm text-muted-foreground">Crunching numbers...</p>
                  )}
                  {financialInsights && financialInsights.length > 0 && (
                    <div className="grid grid-cols-1 gap-4">
                      {financialInsights.map((item, i) => (
                        <div key={i} className="rounded-lg border bg-gray-50 p-4 space-y-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${priorityColor[item.priority] ?? "bg-gray-100 text-gray-700"}`}>
                            {item.priority}
                          </span>
                          <p className="text-sm font-medium text-gray-800">{item.insight}</p>
                          <p className="text-xs text-muted-foreground">{item.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Client Insights */}
              {selectedTool === "client-insights" && (
                <div className="space-y-4">
                  <Button
                    onClick={() => { setInsights(null); clientMutation.mutate(); }}
                    disabled={clientMutation.isPending}
                    className="gap-1.5"
                  >
                    <Sparkles className="h-4 w-4" />
                    {clientMutation.isPending ? "Analyzing…" : "Analyze Clients"}
                  </Button>

                  {clientMutation.isPending && (
                    <p className="text-sm text-muted-foreground">Analyzing client health...</p>
                  )}

                  {insights && insights.length > 0 && (
                    <div className="space-y-2">
                      {insights.map((s) => (
                        <div key={s.client_id} className="p-3 rounded-lg border bg-gray-50 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium">{s.client_name}</p>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${healthColor[s.health] ?? "bg-gray-100 text-gray-700"}`}>
                              {s.health}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{s.reason}</p>
                          <p className="text-xs text-blue-700 font-medium">Action: {s.action}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
