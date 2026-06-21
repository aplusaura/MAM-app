"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User } from "lucide-react";

export interface KanbanColumn {
  id: string;
  label: string;
  color: string;
}

export interface KanbanItem {
  id: number;
  columnId: string;
  title: string;
  subtitle?: string;
  priority?: string;
  badge?: string;
  assignee?: string;
  dueDate?: string;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  items: KanbanItem[];
  onMove: (itemId: number, newColumnId: string) => void;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  high: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  medium: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  low: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
};

function KanbanCard({ item, isDragging }: { item: KanbanItem; isDragging?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 cursor-grab select-none transition-all duration-200 ${
        isDragging ? "shadow-xl scale-[1.02] rotate-[1deg] opacity-90" : "shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-blue-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug flex-1">{item.title}</p>
        {item.priority && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${priorityColors[item.priority] ?? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
            {item.priority}
          </span>
        )}
      </div>
      {item.badge && (
        <span className="inline-block text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded mb-2">
          {item.badge}
        </span>
      )}
      {item.subtitle && (
        <p className="text-xs text-gray-400 mb-2 truncate">{item.subtitle}</p>
      )}
      <div className="flex items-center gap-3 mt-2">
        {item.assignee && (
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <User className="h-3 w-3" />
            {item.assignee}
          </span>
        )}
        {item.dueDate && (
          <span className="flex items-center gap-1 text-[11px] text-gray-400 ml-auto">
            <CalendarDays className="h-3 w-3" />
            {item.dueDate}
          </span>
        )}
      </div>
    </div>
  );
}

function SortableCard({ item }: { item: KanbanItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard item={item} />
    </div>
  );
}

function DroppableColumn({
  column,
  items,
  isOver,
}: {
  column: KanbanColumn;
  items: KanbanItem[];
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div className="w-72 flex-shrink-0 flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <div className={`w-1 h-5 rounded-full ${column.color}`} />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{column.label}</h3>
        <Badge variant="secondary" className="ml-auto text-xs h-5 px-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
          {items.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2.5 min-h-[140px] rounded-xl p-2 transition-colors duration-150 ${
          isOver ? "bg-blue-50/60 dark:bg-blue-900/20 border-2 border-dashed border-blue-200 dark:border-blue-700" : "bg-gray-50/60 dark:bg-gray-800/60"
        }`}
      >
        <SortableContext items={items.length > 0 ? items.map((i) => i.id) : [`${column.id}-placeholder`]} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <SortableCard item={item} />
              </motion.div>
            ))}
          </AnimatePresence>
          {items.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-6 text-xs text-gray-400 dark:text-gray-500 select-none">
              Drop here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export function KanbanBoard({ columns, items, onMove }: KanbanBoardProps) {
  const [activeItem, setActiveItem] = useState<KanbanItem | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const item = items.find((i) => i.id === event.active.id);
    setActiveItem(item ?? null);
  }

  function handleDragOver(event: { over: { id: string | number } | null }) {
    if (!event.over) { setOverColumnId(null); return; }
    const overId = String(event.over.id);
    const isColumn = columns.some((c) => c.id === overId);
    if (isColumn) { setOverColumnId(overId); return; }
    const overItem = items.find((i) => i.id === Number(overId));
    if (overItem) setOverColumnId(overItem.columnId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveItem(null);
    setOverColumnId(null);
    if (!over) return;
    const overId = String(over.id);
    const isColumn = columns.some((c) => c.id === overId);
    const targetColumnId = isColumn
      ? overId
      : items.find((i) => i.id === Number(overId))?.columnId;
    if (!targetColumnId) return;
    const draggedItem = items.find((i) => i.id === Number(active.id));
    if (draggedItem && draggedItem.columnId !== targetColumnId) {
      onMove(draggedItem.id, targetColumnId);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver as never}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <DroppableColumn
            key={column.id}
            column={column}
            items={items.filter((i) => i.columnId === column.id)}
            isOver={overColumnId === column.id}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem && <KanbanCard item={activeItem} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
