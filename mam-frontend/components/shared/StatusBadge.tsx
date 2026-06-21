import { cn } from "@/lib/utils";

const colorMap: Record<string, string> = {
  // Project
  planning:          "bg-slate-100 text-slate-700",
  active:            "bg-emerald-100 text-emerald-700",
  on_hold:           "bg-amber-100 text-amber-700",
  completed:         "bg-blue-100 text-blue-700",
  cancelled:         "bg-red-100 text-red-700",
  // Task
  todo:              "bg-slate-100 text-slate-700",
  in_progress:       "bg-blue-100 text-blue-700",
  review:            "bg-purple-100 text-purple-700",
  under_review:      "bg-purple-100 text-purple-700",
  revisions_needed:  "bg-amber-100 text-amber-700",
  done:              "bg-emerald-100 text-emerald-700",
  overdue:           "bg-red-100 text-red-700",
  // Lead
  new_lead:          "bg-slate-100 text-slate-700",
  new:               "bg-slate-100 text-slate-700",
  contacted:         "bg-sky-100 text-sky-700",
  qualified:         "bg-indigo-100 text-indigo-700",
  proposal:          "bg-violet-100 text-violet-700",
  proposal_sent:     "bg-violet-100 text-violet-700",
  negotiation:       "bg-orange-100 text-orange-700",
  won:               "bg-emerald-100 text-emerald-700",
  lost:              "bg-red-100 text-red-700",
  // Client
  prospect:          "bg-amber-100 text-amber-700",
  inactive:          "bg-slate-100 text-slate-700",
  // Employee availability
  available:         "bg-emerald-100 text-emerald-700",
  busy:              "bg-amber-100 text-amber-700",
  on_leave:          "bg-slate-100 text-slate-700",
  // Invoice
  draft:             "bg-slate-100 text-slate-700",
  sent:              "bg-blue-100 text-blue-700",
  paid:              "bg-emerald-100 text-emerald-700",
  partial:           "bg-amber-100 text-amber-700",
  // Priority
  low:               "bg-slate-100 text-slate-600",
  medium:            "bg-amber-100 text-amber-700",
  high:              "bg-orange-100 text-orange-700",
  urgent:            "bg-red-100 text-red-700",
};

export function StatusBadge({ value }: { value: string }) {
  const label = value.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize whitespace-nowrap",
        colorMap[value] ?? "bg-slate-100 text-slate-700"
      )}
    >
      {label}
    </span>
  );
}
