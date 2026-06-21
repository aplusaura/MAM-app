"use client";

import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay,
  format, parseISO,
} from "date-fns";

export interface CalendarItem {
  id: number;
  title: string;
  date: string;
  color?: string;
  type?: string;
  status?: string;
}

interface CalendarViewProps {
  items: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
  onDayClick?: (date: Date, items: CalendarItem[]) => void;
}

const DEFAULT_COLOR = "bg-blue-500";

function getDayCells(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  let cur = start;
  while (cur <= end) { days.push(cur); cur = addDays(cur, 1); }
  return days;
}

interface TooltipState { item: CalendarItem; x: number; y: number; }
interface DayModalState { date: Date; items: CalendarItem[]; }

export function CalendarView({ items, onItemClick, onDayClick }: CalendarViewProps) {
  const [current, setCurrent] = useState(() => new Date());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [dayModal, setDayModal] = useState<DayModalState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = new Date();
  const days = getDayCells(current);

  const itemsForDay = useCallback((day: Date): CalendarItem[] =>
    items.filter((item) => {
      try { return isSameDay(parseISO(item.date), day); }
      catch { return false; }
    }), [items]);

  const handleItemHover = (e: React.MouseEvent, item: CalendarItem) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    const rect = containerRef.current?.getBoundingClientRect();
    const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(btnRect.left - rect.left, rect.width - 220);
    const y = btnRect.top - rect.top + btnRect.height + 4;
    tooltipTimerRef.current = setTimeout(() => setTooltip({ item, x, y }), 180);
  };

  const handleItemLeave = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTooltip(null);
  };

  const handleDayClick = (day: Date, dayItems: CalendarItem[]) => {
    if (onDayClick) { onDayClick(day, dayItems); return; }
    if (dayItems.length > 0) setDayModal({ date: day, items: dayItems });
  };

  return (
    <div className="select-none relative" ref={containerRef}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{format(current, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrent((d) => subMonths(d, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrent(new Date())}><span className="text-xs font-medium">Today</span></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrent((d) => addMonths(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
        {days.map((day, i) => {
          const dayItems = itemsForDay(day);
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, current);
          const visible = dayItems.slice(0, 3);
          const overflow = dayItems.length - visible.length;
          return (
            <div key={i} onClick={() => handleDayClick(day, dayItems)}
              className={[
                "min-h-[80px] p-1.5 cursor-pointer transition-colors bg-white dark:bg-gray-800",
                !isCurrentMonth ? "opacity-30" : "hover:bg-blue-50/40 dark:hover:bg-blue-900/20",
                isToday ? "ring-2 ring-inset ring-blue-500 bg-blue-50/30" : "",
              ].join(" ")}
            >
              <p className={`text-[11px] font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-blue-500 text-white" : "text-gray-500 dark:text-gray-400"}`}>
                {format(day, "d")}
              </p>
              <div className="flex flex-col gap-0.5">
                {visible.map((item) => (
                  <button key={item.id}
                    onMouseEnter={(e) => handleItemHover(e, item)}
                    onMouseLeave={handleItemLeave}
                    onClick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
                    className={`w-full text-left rounded-full px-1.5 py-0.5 text-[10px] text-white truncate hover:opacity-80 transition-opacity ${item.color ?? DEFAULT_COLOR}`}
                    title={item.title}
                  >
                    {item.title}
                  </button>
                ))}
                {overflow > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDayModal({ date: day, items: dayItems }); }}
                    className="text-[10px] text-blue-500 hover:text-blue-700 px-1 text-left"
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {tooltip && (
        <div className="absolute z-50 pointer-events-none" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-3 py-2.5 text-xs w-52 border border-white/10">
            <p className="font-semibold leading-tight mb-1.5 truncate">{tooltip.item.title}</p>
            <div className="flex flex-col gap-1 text-gray-300">
              {tooltip.item.type && <span className="capitalize"><span className="text-gray-500">Type: </span>{tooltip.item.type.replace(/_/g, " ")}</span>}
              <span><span className="text-gray-500">Date: </span>{format(parseISO(tooltip.item.date), "MMM d, yyyy")}</span>
              {tooltip.item.status && <span className="capitalize"><span className="text-gray-500">Status: </span>{tooltip.item.status.replace(/_/g, " ")}</span>}
            </div>
          </div>
        </div>
      )}

      {dayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDayModal(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">{format(dayModal.date, "EEEE")}</p>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">{format(dayModal.date, "MMMM d, yyyy")}</p>
              </div>
              <button onClick={() => setDayModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
              {dayModal.items.map((item) => (
                <div key={item.id} onClick={() => { onItemClick?.(item); setDayModal(null); }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors group">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${item.color ?? DEFAULT_COLOR}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{item.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.type && <span className="text-xs text-gray-400 capitalize">{item.type.replace(/_/g, " ")}</span>}
                      {item.status && <span className="text-xs text-gray-400 capitalize">· {item.status.replace(/_/g, " ")}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
