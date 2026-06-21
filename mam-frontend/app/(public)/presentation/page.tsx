"use client";

import { useState } from "react";

/* ─── icon helper (inline SVG) ─── */
function Icon({ d, className = "w-6 h-6" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

/* ─── Heroicons paths ─── */
const ICONS = {
  chart: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  users: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  folder: "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z",
  check: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  bolt: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  shield: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  chat: "M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155",
  sparkle: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z",
  cog: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z",
  currency: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  bell: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0",
  doc: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  calendar: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  target: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
  arrow: "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3",
  play: "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z",
  rocket: "M15.59 14.37a48.414 48.414 0 01-6.95 0m6.95 0L18 18.75V21H6v-2.25l2.41-4.38m6.95 0l.95-4.75a.375.375 0 00-.35-.437 48.3 48.3 0 00-8.12 0 .375.375 0 00-.35.437l.95 4.75M12 2.25c1.5 0 3 .5 3.5 2.25h-7C9 2.75 10.5 2.25 12 2.25z",
  globe: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
};

/* ─── reusable components ─── */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-blue-50 text-blue-600 border border-blue-100">
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center mb-4">
      <Badge>{children}</Badge>
    </div>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-12">
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{children}</h2>
      {sub && <p className="mt-4 text-lg text-gray-500 leading-relaxed">{sub}</p>}
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-blue-100 transition-all duration-300">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
        <Icon d={icon} className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="relative flex gap-4 items-start">
      <div className="shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-600/25">
        {num}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function MockScreen({ title, gradient }: { title: string; gradient: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
      <div className="h-7 bg-gray-100 flex items-center px-3 gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-2 text-[10px] text-gray-400 font-medium">{title}</span>
      </div>
      <div className={`h-44 ${gradient}`} />
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
      <button onClick={() => setOpen(!open)} className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <span className="font-medium text-gray-900 pr-4">{q}</span>
        <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {open && <div className="px-6 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-50 pt-3">{a}</div>}
    </div>
  );
}

/* ─── data ─── */
const PROBLEMS = [
  { icon: ICONS.folder, title: "Scattered Client Data", desc: "Client information, contracts, and history spread across spreadsheets, emails, and chat threads.", impact: "30% time wasted searching for information" },
  { icon: ICONS.users, title: "No Team Visibility", desc: "Managers can't see who's working on what, task status is unclear, and workload is unbalanced.", impact: "Missed deadlines and burnout" },
  { icon: ICONS.chart, title: "Manual Reporting", desc: "Hours spent building reports from fragmented data sources with no single source of truth.", impact: "Delayed and inaccurate decisions" },
  { icon: ICONS.currency, title: "Lost Revenue Tracking", desc: "Invoices, payments, and contract values tracked in spreadsheets with no alerts or summaries.", impact: "Missed payments and revenue leakage" },
  { icon: ICONS.clock, title: "No Task Accountability", desc: "Tasks assigned via chat, no approval workflows, no revision tracking, no delivery timestamps.", impact: "Quality issues and blame cycles" },
  { icon: ICONS.bell, title: "Communication Gaps", desc: "Important updates missed, no central notification system, no read receipts or follow-ups.", impact: "Misalignment and rework" },
];

const MODULES = [
  { icon: ICONS.chart, title: "Smart Dashboard", desc: "Real-time overview of tasks, projects, revenue, team workload, and key metrics at a glance.", gradient: "bg-gradient-to-br from-blue-50 via-blue-100/50 to-indigo-50" },
  { icon: ICONS.target, title: "CRM & Leads", desc: "Full lead pipeline from discovery to conversion. Track sources, status, follow-ups, and notes.", gradient: "bg-gradient-to-br from-emerald-50 via-green-100/50 to-teal-50" },
  { icon: ICONS.users, title: "Client Management", desc: "Complete client profiles with contracts, projects, contacts, history, and financial overview.", gradient: "bg-gradient-to-br from-violet-50 via-purple-100/50 to-fuchsia-50" },
  { icon: ICONS.folder, title: "Project Management", desc: "Create projects, link clients, assign teams, track milestones, and monitor progress in real-time.", gradient: "bg-gradient-to-br from-amber-50 via-orange-100/50 to-yellow-50" },
  { icon: ICONS.check, title: "Task Workflow", desc: "Full task lifecycle: create, assign, submit, approve, reject with reasons, revision tracking.", gradient: "bg-gradient-to-br from-sky-50 via-cyan-100/50 to-blue-50" },
  { icon: ICONS.users, title: "Team & Employees", desc: "Employee profiles, roles, departments, KPIs, evaluations, leave tracking, and performance.", gradient: "bg-gradient-to-br from-rose-50 via-pink-100/50 to-red-50" },
  { icon: ICONS.calendar, title: "Shooting Calendar", desc: "Schedule photo/video shoots, manage locations, assign crew, and track equipment.", gradient: "bg-gradient-to-br from-teal-50 via-emerald-100/50 to-green-50" },
  { icon: ICONS.currency, title: "Finance & Invoices", desc: "Create invoices, track payments, monitor revenue, manage expenses, and financial reporting.", gradient: "bg-gradient-to-br from-indigo-50 via-blue-100/50 to-violet-50" },
  { icon: ICONS.doc, title: "Reports & Analytics", desc: "Client performance, task completion, team productivity, revenue trends, and custom reports.", gradient: "bg-gradient-to-br from-orange-50 via-amber-100/50 to-yellow-50" },
  { icon: ICONS.chat, title: "Internal Messaging", desc: "Real-time direct messaging, read receipts, message deletion, conversation management.", gradient: "bg-gradient-to-br from-cyan-50 via-sky-100/50 to-blue-50" },
  { icon: ICONS.sparkle, title: "AI Assistant", desc: "AI-powered content planning, script generation, client insights, and smart recommendations.", gradient: "bg-gradient-to-br from-purple-50 via-violet-100/50 to-indigo-50" },
  { icon: ICONS.cog, title: "Admin & Settings", desc: "Role management, permissions, system configuration, activity logs, and security controls.", gradient: "bg-gradient-to-br from-gray-50 via-slate-100/50 to-zinc-50" },
];

const FEATURES = [
  { icon: ICONS.chart, title: "Real-Time Dashboard", desc: "Live stats, task summaries, revenue overview, and team workload — all in one view." },
  { icon: ICONS.target, title: "Lead-to-Client Conversion", desc: "Track leads through your pipeline and convert them into managed clients with one click." },
  { icon: ICONS.check, title: "Approval Workflows", desc: "Submit, approve, reject with reasons. Full revision history with automatic notifications." },
  { icon: ICONS.shield, title: "Role-Based Permissions", desc: "Granular access control with per-user overrides. Super Admin, Team Lead, Employee tiers." },
  { icon: ICONS.clock, title: "Time Tracking", desc: "Log hours against tasks, track overtime, and measure team utilization automatically." },
  { icon: ICONS.chat, title: "Built-In Messaging", desc: "Direct messages with read receipts, message deletion, and real-time notifications." },
  { icon: ICONS.bell, title: "Smart Notifications", desc: "Task updates, payment reminders, overdue alerts — all routed to the right person." },
  { icon: ICONS.sparkle, title: "AI Content Planner", desc: "Generate content calendars, scripts, and creative briefs powered by AI." },
  { icon: ICONS.currency, title: "Invoice Management", desc: "Create, send, and track invoices. Monitor paid vs. unpaid amounts in real-time." },
  { icon: ICONS.calendar, title: "Shooting Calendar", desc: "Visual schedule for photo and video production with crew assignment." },
  { icon: ICONS.doc, title: "Shooting Briefs", desc: "Structured briefs attached to tasks with location, requirements, and equipment lists." },
  { icon: ICONS.globe, title: "Content Moderation", desc: "Moderator review queue for content approval before publication." },
];

const ROLES = [
  { name: "Super Admin", color: "bg-red-50 text-red-700 border-red-100", access: "Full system access", can: "Manage all users, roles, data, settings, and delete conversations", cannot: "Cannot be deleted from the system" },
  { name: "Account Manager", color: "bg-blue-50 text-blue-700 border-blue-100", access: "Client & project management", can: "Manage clients, create projects, approve tasks at AM level, view finances", cannot: "Cannot manage system settings or roles" },
  { name: "Team Leader", color: "bg-indigo-50 text-indigo-700 border-indigo-100", access: "Team & task oversight", can: "Assign tasks, approve/reject work (including own), manage team members", cannot: "Cannot access finance or system admin" },
  { name: "Video Editor", color: "bg-purple-50 text-purple-700 border-purple-100", access: "Assigned tasks only", can: "View assigned tasks, submit deliveries, log time, attach files", cannot: "Cannot approve tasks, edit task details, or view all clients" },
  { name: "Graphic Designer", color: "bg-pink-50 text-pink-700 border-pink-100", access: "Assigned tasks only", can: "View assigned tasks, submit deliveries, manage personal checklist", cannot: "Cannot approve own work or access admin features" },
  { name: "Moderator", color: "bg-teal-50 text-teal-700 border-teal-100", access: "Content review queue", can: "Review and approve content for publication, mark as published", cannot: "Cannot manage projects, clients, or team settings" },
];

const AI_FEATURES = [
  { title: "AI Content Planner", desc: "Generate monthly content calendars tailored to client industries and target audiences.", status: "Active" },
  { title: "AI Script Generator", desc: "Create video scripts, social media captions, and creative copy from brief inputs.", status: "Active" },
  { title: "AI Task Timeline", desc: "Automatically suggest task timelines and deadlines based on project scope and team capacity.", status: "In Development" },
  { title: "AI Client Insights", desc: "Analyze client data to surface engagement patterns, risks, and growth opportunities.", status: "In Development" },
  { title: "AI Smart Recommendations", desc: "Suggest follow-up actions, resource allocation, and priority adjustments.", status: "Planned" },
  { title: "AI Report Generator", desc: "Auto-generate weekly and monthly performance reports from real system data.", status: "Planned" },
];

const AUTOMATIONS = [
  { trigger: "Task submitted for approval", action: "Notify Team Leader + Account Manager", benefit: "Zero delay in review cycle" },
  { trigger: "Task rejected with reason", action: "Notify assignee + save comment to task", benefit: "Clear feedback loop" },
  { trigger: "Task overdue", action: "Alert in notification center + dashboard badge", benefit: "Proactive deadline management" },
  { trigger: "New message received", action: "Sound notification + unread badge update", benefit: "Real-time communication" },
  { trigger: "Notification dropdown opened", action: "Auto-mark all notifications as read", benefit: "Clean notification state" },
  { trigger: "Chat thread opened", action: "Mark messages as seen + update unread count", benefit: "Accurate read status" },
  { trigger: "Invoice payment recorded", action: "Update financial dashboard + client profile", benefit: "Real-time revenue tracking" },
  { trigger: "Employee status changed", action: "Log to activity feed + notify admin", benefit: "Full audit trail" },
];

const ROADMAP = [
  { phase: "Phase 1", title: "Core Stability", status: "In Progress", color: "border-blue-500 bg-blue-50", items: ["Fix reported bugs across all modules", "Improve performance and loading times", "Stabilize CRM, clients, projects, and tasks", "Enhance permissions and role management", "Polish notification system and seen status"] },
  { phase: "Phase 2", title: "AI Enhancement", status: "Next", color: "border-violet-500 bg-violet-50", items: ["Improve AI output quality and accuracy", "Refine prompts for better content generation", "Add AI-powered client insights dashboard", "Implement AI report generation", "Smart follow-up suggestions for CRM"] },
  { phase: "Phase 3", title: "Automation Layer", status: "Planned", color: "border-amber-500 bg-amber-50", items: ["Automated weekly performance reports", "Deadline prediction and workload alerts", "Smart task assignment suggestions", "Payment reminder automation", "Client engagement scoring"] },
  { phase: "Phase 4", title: "Scale & SaaS", status: "Future", color: "border-emerald-500 bg-emerald-50", items: ["Multi-tenant architecture", "Subscription and billing system", "Public API for integrations", "Advanced security and compliance", "Self-service onboarding flow"] },
];

const FAQS: [string, string][] = [
  ["What is MAM?", "MAM (Marketing Agency Manager) is a complete business operating system built specifically for marketing and media agencies. It connects CRM, project management, task workflows, team management, finance, and AI tools into one unified platform."],
  ["Who is MAM built for?", "MAM is designed for marketing agencies, media production companies, creative studios, and digital agencies that manage clients, projects, teams, and content production workflows."],
  ["Does MAM include CRM?", "Yes. MAM includes a full CRM pipeline with lead tracking, source management, status workflows, and seamless lead-to-client conversion."],
  ["Does it include project management?", "Yes. You can create projects linked to clients, assign team members, set milestones, track progress, and manage the full project lifecycle."],
  ["How does the task approval workflow work?", "Employees submit deliveries, Team Leaders review and approve or reject with reasons. Rejected tasks include comments and notify the assignee. Account Managers provide final review for client-facing work."],
  ["Are the AI features final?", "The AI features are actively being developed and improved. Content planning and script generation are functional. Advanced features like client insights and automated reports are in development."],
  ["Can admins control permissions?", "Yes. The system supports granular role-based permissions with per-user overrides. Admins can control exactly what each team member can see, edit, or manage."],
  ["Can the system track invoices and payments?", "Yes. MAM includes invoice creation, payment tracking, revenue monitoring, and financial reporting — all linked to clients and projects."],
  ["Is MAM still under active development?", "Yes. The platform is in active testing and refinement. The team uses it daily, discovers issues, and continuously improves the experience across all modules."],
  ["What makes MAM different from other tools?", "Unlike generic tools, MAM is purpose-built for agency workflows. It combines CRM, project management, task approval, team management, finance, shooting schedules, and AI — all in one platform designed for how agencies actually work."],
  ["Can MAM become a SaaS product?", "Yes. The architecture is designed to support multi-tenant SaaS deployment. The roadmap includes subscription management, self-service onboarding, and public API access."],
  ["Is it mobile responsive?", "Yes. The entire interface is fully responsive and works on desktop, tablet, and mobile devices with optimized layouts for each screen size."],
];

/* ─── nav items ─── */
const NAV = ["Overview", "Modules", "Features", "AI", "Roadmap", "FAQ"];

/* ═══════════════════════════════════════ MAIN PAGE ═══════════════════════════════════════ */
export default function PresentationPage() {
  const [mobileNav, setMobileNav] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileNav(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900" style={{ fontFamily: "'Inter', 'Cairo', system-ui, sans-serif" }}>

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-600/25">M</div>
            <span className="text-lg font-bold tracking-tight">MAM</span>
            <span className="hidden sm:inline text-xs text-gray-400 ml-1">Agency OS</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <button key={n} onClick={() => scrollTo(n.toLowerCase())} className="px-3 py-1.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                {n}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Sign In</a>
            <a href="/login" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md shadow-blue-600/25 transition-colors">Get Started</a>
            <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>
          </div>
        </div>
        {mobileNav && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1">
            {NAV.map((n) => (
              <button key={n} onClick={() => scrollTo(n.toLowerCase())} className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50">{n}</button>
            ))}
          </div>
        )}
      </nav>

      {/* ══════════════ 1. HERO ══════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <Badge>Built for Marketing & Media Agencies</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.1]">
              The Complete Operating System<br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">for Modern Agencies</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
              CRM, project management, task workflows, team operations, finance tracking, and AI-powered insights — unified in one platform designed for how agencies actually work.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/login" className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl hover:shadow-blue-600/30 flex items-center justify-center gap-2">
                Start Managing <Icon d={ICONS.arrow} className="w-4 h-4" />
              </a>
              <button onClick={() => scrollTo("overview")} className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors flex items-center justify-center gap-2">
                <Icon d={ICONS.play} className="w-4 h-4" /> See How It Works
              </button>
            </div>
          </div>

          {/* Hero mockup */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-gray-900/10 bg-white">
              <div className="h-8 bg-gray-100 flex items-center px-4 gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-gray-400">MAM — Agency OS Dashboard</span>
              </div>
              <div className="flex h-[320px] sm:h-[420px]">
                {/* Sidebar mock */}
                <div className="hidden sm:block w-52 bg-gradient-to-b from-gray-900 to-gray-800 p-4 space-y-1">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">M</div>
                    <span className="text-sm font-semibold text-white">MAM</span>
                  </div>
                  {["Dashboard", "Leads", "Clients", "Projects", "Tasks", "Employees", "Calendar", "Messages", "Finance", "Reports", "AI Tools", "Settings"].map((item, i) => (
                    <div key={item} className={`text-xs px-3 py-2 rounded-lg ${i === 0 ? "bg-blue-600/20 text-blue-400 font-medium" : "text-gray-400 hover:text-gray-200"}`}>
                      {item}
                    </div>
                  ))}
                </div>
                {/* Main content mock */}
                <div className="flex-1 bg-gray-50 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-gray-800">Dashboard</span>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white border border-gray-200" />
                      <div className="w-6 h-6 rounded-lg bg-white border border-gray-200" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Active Projects", val: "24", color: "text-blue-600" },
                      { label: "Open Tasks", val: "156", color: "text-amber-600" },
                      { label: "Team Members", val: "18", color: "text-emerald-600" },
                      { label: "Revenue (MTD)", val: "$47.2K", color: "text-violet-600" },
                    ].map((s) => (
                      <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">{s.label}</p>
                        <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl border border-gray-100 p-4 h-36">
                      <p className="text-xs font-semibold text-gray-700 mb-3">Task Progress</p>
                      <div className="space-y-2">
                        {[["Done", "68%", "bg-emerald-500", "w-[68%]"], ["In Progress", "22%", "bg-blue-500", "w-[22%]"], ["Overdue", "10%", "bg-red-500", "w-[10%]"]].map(([l, p, c, w]) => (
                          <div key={l as string}>
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1"><span>{l}</span><span>{p}</span></div>
                            <div className="h-1.5 bg-gray-100 rounded-full"><div className={`h-1.5 rounded-full ${c} ${w}`} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 h-36">
                      <p className="text-xs font-semibold text-gray-700 mb-3">Recent Activity</p>
                      <div className="space-y-2.5">
                        {["Omar submitted delivery for Social Media Pack", "Sarah approved Video Edit task", "New lead: Digital Agency NYC", "Invoice #1042 paid by AcmeCorp"].map((a, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <p className="text-[10px] text-gray-500 leading-tight">{a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-12 max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[["12+", "Core Modules"], ["10+", "User Roles"], ["20+", "Automations"], ["AI", "Powered"]].map(([v, l]) => (
              <div key={l as string}>
                <p className="text-2xl font-bold text-blue-600">{v}</p>
                <p className="text-xs text-gray-400 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 2. PRODUCT OVERVIEW ══════════════ */}
      <section id="overview" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>Product Overview</SectionLabel>
          <SectionTitle sub="MAM replaces the patchwork of spreadsheets, chat apps, project tools, and manual reports that agencies cobble together. It gives your entire team one unified platform — from the first lead to the final invoice.">
            One Platform. Every Agency Workflow.
          </SectionTitle>
          <div className="grid md:grid-cols-3 gap-8 mt-8">
            {[
              { icon: ICONS.target, title: "Acquire", desc: "Capture leads, track pipeline, convert to clients. Full CRM built for agency sales cycles." },
              { icon: ICONS.folder, title: "Deliver", desc: "Manage projects, assign tasks, approve deliveries, schedule shoots. Everything creative teams need." },
              { icon: ICONS.chart, title: "Grow", desc: "Track revenue, analyze performance, get AI insights. Data-driven decisions for agency growth." },
            ].map((item) => (
              <div key={item.title} className="text-center p-8 rounded-2xl bg-gradient-to-b from-gray-50 to-white border border-gray-100">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-5">
                  <Icon d={item.icon} className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 3. PROBLEMS ══════════════ */}
      <section className="py-20 sm:py-28 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>The Problem</SectionLabel>
          <SectionTitle sub="Running an agency without a unified system means constant friction. These problems cost time, money, and team morale every single day.">
            Agency Operations Shouldn&apos;t Be This Hard
          </SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                  <Icon d={p.icon} className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{p.desc}</p>
                <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  {p.impact}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 4. SOLUTION ══════════════ */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>The Solution</SectionLabel>
          <SectionTitle sub="MAM connects every part of your agency into a single, intelligent workflow. No more switching between tools. No more lost information.">
            Everything Connected. Everything Visible.
          </SectionTitle>
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {["Client Data", "Projects", "Team Tasks", "AI Assist", "Finance", "Reports", "Decisions"].map((step, i, arr) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">{step}</span>
                  {i < arr.length - 1 && <Icon d={ICONS.arrow} className="w-4 h-4 text-blue-300" />}
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-red-50/50 border border-red-100">
                <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2"><span className="text-lg">Before MAM</span></h3>
                <ul className="space-y-2.5 text-sm text-red-600/80">
                  {["5+ tools to manage one project", "Manual task tracking in spreadsheets", "No visibility into team workload", "Invoices lost in email threads", "Decisions based on gut feeling"].map((t) => (
                    <li key={t} className="flex items-start gap-2"><span className="mt-1 text-red-400">✕</span> {t}</li>
                  ))}
                </ul>
              </div>
              <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <h3 className="font-semibold text-emerald-700 mb-4 flex items-center gap-2"><span className="text-lg">After MAM</span></h3>
                <ul className="space-y-2.5 text-sm text-emerald-600/80">
                  {["One platform for everything", "Automated approval workflows", "Real-time dashboards and alerts", "Invoices linked to clients and projects", "AI-powered insights and recommendations"].map((t) => (
                    <li key={t} className="flex items-start gap-2"><span className="mt-1 text-emerald-500">✓</span> {t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ 5. HOW IT WORKS ══════════════ */}
      <section className="py-20 sm:py-28 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>How It Works</SectionLabel>
          <SectionTitle sub="From onboarding your first client to reviewing monthly performance — MAM guides your team through every step.">
            Simple Steps. Powerful Results.
          </SectionTitle>
          <div className="max-w-2xl mx-auto space-y-8">
            {[
              { title: "Add Your Team", desc: "Set up employees with roles, departments, and permissions. Each team member gets a personalized dashboard." },
              { title: "Import or Create Clients", desc: "Add client profiles with contracts, contacts, and project history. Convert leads directly from the CRM." },
              { title: "Create Projects", desc: "Link projects to clients, define scope, set milestones, and assign team members." },
              { title: "Assign & Track Tasks", desc: "Create tasks with deadlines, checklists, and briefs. Track progress through submission and approval workflows." },
              { title: "Collaborate in Real-Time", desc: "Use built-in messaging, comments, and notifications. Everyone stays aligned without leaving the platform." },
              { title: "Leverage AI Tools", desc: "Generate content plans, scripts, and insights. Let AI handle the repetitive work while your team focuses on creativity." },
              { title: "Review & Grow", desc: "Access real-time dashboards, reports, and analytics. Make data-driven decisions to scale your agency." },
            ].map((step, i) => (
              <StepCard key={step.title} num={i + 1} title={step.title} desc={step.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 6. MODULES ══════════════ */}
      <section id="modules" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>Core Modules</SectionLabel>
          <SectionTitle sub="12 integrated modules covering every aspect of agency operations — from lead capture to financial reporting.">
            Built for Every Part of Your Agency
          </SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map((m) => (
              <div key={m.title} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-blue-100 transition-all duration-300">
                <div className={`h-32 ${m.gradient} flex items-center justify-center`}>
                  <div className="w-14 h-14 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Icon d={m.icon} className="w-7 h-7 text-blue-600" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">{m.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 7. FEATURES ══════════════ */}
      <section id="features" className="py-20 sm:py-28 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>Feature Highlights</SectionLabel>
          <SectionTitle sub="Every feature is designed around real agency workflows — not generic project management templates.">
            Features That Actually Matter
          </SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 8. PRODUCT SCREENSHOTS ══════════════ */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>Product Showcase</SectionLabel>
          <SectionTitle sub="A look inside the platform — every screen designed for clarity, speed, and beautiful presentation of your agency data.">
            See MAM in Action
          </SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Dashboard — Manager View", gradient: "bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-50" },
              { title: "CRM — Lead Pipeline", gradient: "bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-50" },
              { title: "Task Detail — Approval Flow", gradient: "bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50" },
              { title: "Client Profile", gradient: "bg-gradient-to-br from-violet-100 via-violet-50 to-purple-50" },
              { title: "Employee Dashboard", gradient: "bg-gradient-to-br from-sky-100 via-sky-50 to-cyan-50" },
              { title: "Finance — Invoices", gradient: "bg-gradient-to-br from-rose-100 via-rose-50 to-pink-50" },
              { title: "AI Content Planner", gradient: "bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-50" },
              { title: "Shooting Calendar", gradient: "bg-gradient-to-br from-teal-100 via-teal-50 to-emerald-50" },
              { title: "Reports & Analytics", gradient: "bg-gradient-to-br from-orange-100 via-orange-50 to-amber-50" },
            ].map((s) => (
              <MockScreen key={s.title} title={s.title} gradient={s.gradient} />
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">Screenshots represent actual product screens. Real captures will be added as they become available.</p>
        </div>
      </section>

      {/* ══════════════ 9 & 10. USER + ADMIN JOURNEY ══════════════ */}
      <section className="py-20 sm:py-28 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>User Journey</SectionLabel>
          <SectionTitle sub="Whether you're a team member delivering creative work or an admin running the entire operation — MAM adapts to your role.">
            Designed for Every Role
          </SectionTitle>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Employee journey */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Icon d={ICONS.users} className="w-5 h-5" /></div>
                Team Member Journey
              </h3>
              <div className="space-y-4">
                {["Log in and view personalized dashboard", "Check assigned tasks and deadlines", "Submit deliveries for review", "Receive feedback via comments", "Track time and log work hours", "Chat with team members", "Get notified about updates"].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                    {s}
                  </div>
                ))}
              </div>
            </div>
            {/* Admin journey */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Icon d={ICONS.shield} className="w-5 h-5" /></div>
                Admin / Super Admin Journey
              </h3>
              <div className="space-y-4">
                {["Full dashboard with company-wide metrics", "Manage all users, roles, and permissions", "Monitor every project and client", "Review and approve team deliveries", "Track revenue, invoices, and payments", "Access reports and AI insights", "Control system settings and security"].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ 11. ROLES & PERMISSIONS ══════════════ */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>Roles & Permissions</SectionLabel>
          <SectionTitle sub="Granular access control ensures every team member sees exactly what they need — nothing more, nothing less.">
            Right Access. Right People.
          </SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ROLES.map((r) => (
              <div key={r.name} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${r.color} mb-4`}>{r.name}</span>
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">{r.access}</p>
                <div className="space-y-2 text-sm">
                  <p className="text-emerald-600 flex items-start gap-1.5"><span className="mt-0.5">✓</span> {r.can}</p>
                  <p className="text-red-400 flex items-start gap-1.5"><span className="mt-0.5">✕</span> {r.cannot}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 12. AI FEATURES ══════════════ */}
      <section id="ai" className="py-20 sm:py-28 bg-gradient-to-br from-indigo-50 via-[#F8FAFC] to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>AI-Powered</SectionLabel>
          <SectionTitle sub="Augment your team's capabilities with intelligent automation, content generation, and data-driven recommendations.">
            Smarter Agency Operations
          </SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {AI_FEATURES.map((f) => (
              <div key={f.title} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Icon d={ICONS.sparkle} className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    f.status === "Active" ? "bg-emerald-50 text-emerald-600" :
                    f.status === "In Development" ? "bg-amber-50 text-amber-600" :
                    "bg-gray-100 text-gray-500"
                  }`}>{f.status}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-violet-100 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <Icon d={ICONS.sparkle} className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Development Status</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  The AI layer is currently under active development. We are continuously testing, improving prompts, enhancing output quality, refining recommendations, and optimizing the overall AI experience based on real team feedback and product usage. Each iteration brings measurably better results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ 13. AUTOMATIONS ══════════════ */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>Automations</SectionLabel>
          <SectionTitle sub="Reduce manual work with intelligent automations that keep your team informed and your operations running smoothly.">
            Less Manual Work. More Flow.
          </SectionTitle>
          <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Trigger</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Action</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Benefit</th>
                </tr>
              </thead>
              <tbody>
                {AUTOMATIONS.map((a, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-800">{a.trigger}</td>
                    <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">{a.action}</td>
                    <td className="px-5 py-3.5 text-emerald-600 text-xs font-medium">{a.benefit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════ 14. ANALYTICS ══════════════ */}
      <section className="py-20 sm:py-28 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>Analytics & Reports</SectionLabel>
          <SectionTitle sub="Real-time data across every dimension of your agency — from client health to team productivity to financial performance.">
            Data-Driven Decisions
          </SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: "Client Performance", items: ["Project progress", "Contract value", "Payment history", "Engagement score"], color: "border-t-blue-500" },
              { title: "Team Productivity", items: ["Task completion rate", "Time utilization", "Revision frequency", "Workload balance"], color: "border-t-emerald-500" },
              { title: "Financial Overview", items: ["Revenue MTD/YTD", "Paid vs unpaid", "Invoice aging", "Expense tracking"], color: "border-t-violet-500" },
              { title: "System Activity", items: ["User engagement", "CRM conversion", "AI usage stats", "Activity timeline"], color: "border-t-amber-500" },
            ].map((cat) => (
              <div key={cat.title} className={`bg-white rounded-xl border border-gray-100 ${cat.color} border-t-2 p-5`}>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">{cat.title}</h3>
                <ul className="space-y-2">
                  {cat.items.map((item) => (
                    <li key={item} className="text-xs text-gray-500 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-300" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 15. USP / COMPARISON ══════════════ */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>Why MAM</SectionLabel>
          <SectionTitle sub="MAM isn't just another project management tool. It's the only platform purpose-built for how marketing and media agencies actually operate.">
            The Unfair Advantage
          </SectionTitle>
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full text-sm rounded-2xl overflow-hidden border border-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-4 font-semibold text-gray-900">Capability</th>
                  <th className="px-5 py-4 text-center font-semibold text-blue-600 bg-blue-50/50">MAM</th>
                  <th className="px-5 py-4 text-center font-semibold text-gray-400">Generic CRM</th>
                  <th className="px-5 py-4 text-center font-semibold text-gray-400">Task Tool</th>
                  <th className="px-5 py-4 text-center font-semibold text-gray-400 hidden sm:table-cell">Spreadsheets</th>
                </tr>
              </thead>
              <tbody>
                {[
                  "CRM & Lead Pipeline", "Project Management", "Task Approval Workflow", "Team & Role Management",
                  "Shooting Calendar", "Invoice & Payment Tracking", "Internal Messaging", "AI-Powered Tools",
                  "Real-Time Dashboards", "Agency-Specific Workflows",
                ].map((cap) => (
                  <tr key={cap} className="border-t border-gray-50">
                    <td className="px-5 py-3 text-gray-700 font-medium">{cap}</td>
                    <td className="px-5 py-3 text-center text-emerald-500 bg-blue-50/20 font-bold">✓</td>
                    <td className="px-5 py-3 text-center text-gray-300">{["CRM & Lead Pipeline", "Real-Time Dashboards"].includes(cap) ? "✓" : "—"}</td>
                    <td className="px-5 py-3 text-center text-gray-300">{["Project Management", "Task Approval Workflow"].includes(cap) ? "~" : "—"}</td>
                    <td className="px-5 py-3 text-center text-gray-300 hidden sm:table-cell">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════════ 16. BUSINESS VALUE ══════════════ */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-blue-100 mb-4">
              Business Impact
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Measurable Results for Your Agency</h2>
            <p className="mt-4 text-lg text-blue-100/80">Real operational improvements that translate directly to your bottom line.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { metric: "40%", label: "Faster task execution", desc: "Streamlined approval workflows eliminate bottlenecks" },
              { metric: "60%", label: "Less tool switching", desc: "Everything in one platform instead of five" },
              { metric: "3x", label: "Better visibility", desc: "Real-time dashboards replace manual status updates" },
              { metric: "90%", label: "Fewer missed deadlines", desc: "Automated alerts and overdue notifications" },
            ].map((v) => (
              <div key={v.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <p className="text-3xl font-bold text-white mb-2">{v.metric}</p>
                <p className="text-sm font-semibold text-blue-100 mb-2">{v.label}</p>
                <p className="text-xs text-blue-200/70">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 17. CURRENT STATUS ══════════════ */}
      <section className="py-20 sm:py-28 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>Development Status</SectionLabel>
          <SectionTitle sub="Transparency builds trust. Here's exactly where we are in the product lifecycle.">
            Active Development & Testing
          </SectionTitle>
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
            <div className="space-y-6">
              <p className="text-gray-600 leading-relaxed">
                The system is currently in an active testing and refinement phase. The full team is using the product daily, testing workflows, discovering bugs, reporting issues, and improving the experience across all modules.
              </p>
              <p className="text-gray-600 leading-relaxed">
                This phase is focused on stabilizing the core product, improving AI output quality, enhancing performance, and making sure every feature works smoothly in real operational use.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                {[
                  { label: "Core Modules", status: "Stable", color: "bg-emerald-100 text-emerald-700" },
                  { label: "Task Workflows", status: "Stable", color: "bg-emerald-100 text-emerald-700" },
                  { label: "CRM & Clients", status: "Stable", color: "bg-emerald-100 text-emerald-700" },
                  { label: "Finance Module", status: "Stable", color: "bg-emerald-100 text-emerald-700" },
                  { label: "Messaging System", status: "Stable", color: "bg-emerald-100 text-emerald-700" },
                  { label: "AI Features", status: "Improving", color: "bg-amber-100 text-amber-700" },
                  { label: "Performance", status: "Optimizing", color: "bg-blue-100 text-blue-700" },
                  { label: "UX Polish", status: "Ongoing", color: "bg-violet-100 text-violet-700" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className="text-sm text-gray-700 font-medium">{s.label}</span>
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${s.color}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ 18. ROADMAP ══════════════ */}
      <section id="roadmap" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>Roadmap</SectionLabel>
          <SectionTitle sub="A clear path from where we are today to where we're heading. Each phase builds on the last.">
            What&apos;s Next
          </SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROADMAP.map((r) => (
              <div key={r.phase} className={`rounded-2xl border-t-4 ${r.color} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{r.phase}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    r.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                    r.status === "Next" ? "bg-violet-100 text-violet-700" :
                    r.status === "Planned" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>{r.status}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-4">{r.title}</h3>
                <ul className="space-y-2">
                  {r.items.map((item) => (
                    <li key={item} className="text-xs text-gray-500 flex items-start gap-2">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 19. FAQ ══════════════ */}
      <section id="faq" className="py-20 sm:py-28 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel>FAQ</SectionLabel>
          <SectionTitle sub="Answers to the most common questions about MAM.">
            Frequently Asked Questions
          </SectionTitle>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map(([q, a]) => (
              <FAQItem key={q} q={q} a={a} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ 20. FINAL CTA ══════════════ */}
      <section className="py-20 sm:py-28 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
            Ready to Run Your Agency<br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Like a Well-Oiled Machine?</span>
          </h2>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            This is not just a management tool. It is a complete operating system for modern marketing and media teams — connecting every workflow, every team member, and every decision into one seamless experience.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/login" className="w-full sm:w-auto px-8 py-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl flex items-center justify-center gap-2">
              Get Started Now <Icon d={ICONS.arrow} className="w-4 h-4" />
            </a>
            <button onClick={() => scrollTo("overview")} className="w-full sm:w-auto px-8 py-4 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors">
              Explore Features
            </button>
          </div>
        </div>
      </section>

      {/* ── Status Note ── */}
      <section className="py-12 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400 leading-relaxed">
            The platform is currently in an active testing phase. The full team is testing the system across real workflows, discovering bugs, reporting issues, and improving the user experience. AI-powered features are also being refined — including prompt quality, result accuracy, recommendations, and automation logic. The goal is to keep refining the system until every core workflow is stable, smooth, and ready for wider usage.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-950 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">M</div>
              <span className="font-semibold text-white">MAM</span>
              <span className="text-xs text-gray-500">Agency OS</span>
            </div>
            <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} MAM — Marketing Agency Manager. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
