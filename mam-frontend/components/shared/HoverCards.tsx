"use client";

import { format } from "date-fns";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getMediaUrl } from "@/lib/api";
import { Calendar, User, Briefcase, Building2, Phone, Mail, Tag, TrendingUp } from "lucide-react";

// ── Shared row helper ─────────────────────────────────────
function Row({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide block leading-none mb-0.5">{label}</span>
        <span className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-tight">{value}</span>
      </div>
    </div>
  );
}

const cardBase = "w-72 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl p-4 space-y-3";

// ── Task hover card ────────────────────────────────────────
interface TaskHoverData {
  id: number;
  title: string;
  status: string;
  priority?: string;
  task_type?: string | null;
  due_date?: string | null;
  description?: string | null;
}

export function TaskHoverCard({ task, assigneeName, projectName }: { task: TaskHoverData; assigneeName?: string; projectName?: string }) {
  const isOverdue = task.due_date && !["done", "cancelled"].includes(task.status) && new Date(task.due_date) < new Date();
  return (
    <div className={cardBase}>
      <div className="pb-2 border-b border-gray-100 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">{task.title}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <StatusBadge value={task.status} />
          {task.priority && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              task.priority === "urgent" ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" :
              task.priority === "high" ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" :
              task.priority === "medium" ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" :
              "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}>{task.priority}</span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {assigneeName && <Row icon={User} label="Assigned to" value={assigneeName} />}
        {projectName && <Row icon={Briefcase} label="Project" value={projectName} />}
        {task.task_type && <Row icon={Tag} label="Type" value={task.task_type.replace(/_/g, " ")} />}
        {task.due_date && (
          <Row icon={Calendar} label="Due date" value={
            <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
              {format(new Date(task.due_date), "MMM d, yyyy")}
              {isOverdue && " · Overdue"}
            </span>
          } />
        )}
        {task.description && (
          <p className="text-[11px] text-gray-400 line-clamp-2 pt-1 border-t border-gray-50 dark:border-gray-700">{task.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Project hover card ─────────────────────────────────────
interface ProjectHoverData {
  id: number;
  name: string;
  status: string;
  priority?: string;
  due_date?: string | null;
  client_id?: number;
  description?: string | null;
}

export function ProjectHoverCard({ project, clientName }: { project: ProjectHoverData; clientName?: string }) {
  const isOverdue = project.due_date && !["completed", "cancelled"].includes(project.status) && new Date(project.due_date) < new Date();
  return (
    <div className={cardBase}>
      <div className="pb-2 border-b border-gray-100 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{project.name}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <StatusBadge value={project.status} />
          {project.priority && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              project.priority === "urgent" ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" :
              project.priority === "high" ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" :
              project.priority === "medium" ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" :
              "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}>{project.priority}</span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {clientName && <Row icon={Building2} label="Client" value={clientName} />}
        {project.due_date && (
          <Row icon={Calendar} label="Due date" value={
            <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
              {format(new Date(project.due_date), "MMM d, yyyy")}
              {isOverdue && " · Overdue"}
            </span>
          } />
        )}
        {project.description && (
          <p className="text-[11px] text-gray-400 line-clamp-2 pt-1 border-t border-gray-50 dark:border-gray-700">{project.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Employee hover card ────────────────────────────────────
interface EmployeeHoverData {
  id: number;
  full_name: string;
  job_title?: string;
  status: string;
  availability_status: string;
  phone?: string;
  skills?: string[];
  profile_image_url?: string | null;
}

export function EmployeeHoverCard({ employee, departmentName, openTaskCount }: { employee: EmployeeHoverData; departmentName?: string; openTaskCount?: number }) {
  const initials = employee.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const photoUrl = employee.profile_image_url
    ? (employee.profile_image_url.startsWith("http") ? employee.profile_image_url : getMediaUrl(employee.profile_image_url))
    : null;
  return (
    <div className={cardBase}>
      <div className="flex items-center gap-3 pb-2 border-b border-gray-100 dark:border-gray-700">
        <div className="h-10 w-10 rounded-full overflow-hidden bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
          {photoUrl ? <img src={photoUrl} alt={employee.full_name} className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{employee.full_name}</p>
          {employee.job_title && <p className="text-xs text-gray-400 truncate">{employee.job_title}</p>}
          <div className="flex items-center gap-1.5 mt-1">
            <StatusBadge value={employee.status} />
            <StatusBadge value={employee.availability_status} />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {departmentName && <Row icon={Building2} label="Department" value={departmentName} />}
        {employee.phone && <Row icon={Phone} label="Phone" value={employee.phone} />}
        {openTaskCount !== undefined && <Row icon={Briefcase} label="Open tasks" value={openTaskCount} />}
        {employee.skills && employee.skills.length > 0 && (
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Skills</span>
            <div className="flex flex-wrap gap-1">
              {employee.skills.slice(0, 4).map(s => (
                <span key={s} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">{s}</span>
              ))}
              {employee.skills.length > 4 && <span className="text-[10px] text-gray-400">+{employee.skills.length - 4}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Client hover card ──────────────────────────────────────
interface ClientHoverData {
  id: number;
  company_name: string;
  status: string;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
}

export function ClientHoverCard({ client }: { client: ClientHoverData }) {
  return (
    <div className={cardBase}>
      <div className="pb-2 border-b border-gray-100 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{client.company_name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <StatusBadge value={client.status} />
          {client.industry && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{client.industry}</span>}
        </div>
      </div>
      <div className="space-y-2">
        {client.phone && <Row icon={Phone} label="Phone" value={client.phone} />}
        {client.email && <Row icon={Mail} label="Email" value={client.email} />}
        {(client.city || client.country) && (
          <Row icon={Building2} label="Location" value={[client.city, client.country].filter(Boolean).join(", ")} />
        )}
      </div>
    </div>
  );
}

// ── Lead hover card ────────────────────────────────────────
interface LeadHoverData {
  id: number;
  lead_name: string;
  company_name?: string | null;
  contact_person?: string | null;
  stage: string;
  interested_service?: string | null;
  expected_budget?: number | null;
  phone?: string | null;
  email?: string | null;
}

export function LeadHoverCard({ lead }: { lead: LeadHoverData }) {
  return (
    <div className={cardBase}>
      <div className="pb-2 border-b border-gray-100 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{lead.company_name || lead.lead_name}</p>
        {lead.contact_person && (
          <p className="text-xs text-gray-400">{lead.contact_person}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <StatusBadge value={lead.stage} />
          {lead.interested_service && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full capitalize">{lead.interested_service}</span>}
        </div>
      </div>
      <div className="space-y-2">
        {lead.expected_budget != null && (
          <Row icon={TrendingUp} label="Expected Budget" value={`$${Number(lead.expected_budget).toLocaleString()}`} />
        )}
        {lead.phone && <Row icon={Phone} label="Phone" value={lead.phone} />}
        {lead.email && <Row icon={Mail} label="Email" value={lead.email} />}
      </div>
    </div>
  );
}
