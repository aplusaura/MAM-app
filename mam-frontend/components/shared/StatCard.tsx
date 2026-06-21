"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "orange";
  index?: number;
  onClick?: () => void;
}

const colorMap = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-900/30",     icon: "text-blue-600 dark:text-blue-400" },
  green:  { bg: "bg-emerald-50 dark:bg-emerald-900/30", icon: "text-emerald-600 dark:text-emerald-400" },
  yellow: { bg: "bg-amber-50 dark:bg-amber-900/30",   icon: "text-amber-600 dark:text-amber-400" },
  red:    { bg: "bg-red-50 dark:bg-red-900/30",       icon: "text-red-600 dark:text-red-400" },
  purple: { bg: "bg-purple-50 dark:bg-purple-900/30", icon: "text-purple-600 dark:text-purple-400" },
  orange: { bg: "bg-orange-50 dark:bg-orange-900/30", icon: "text-orange-600 dark:text-orange-400" },
};

export function StatCard({ title, value, icon: Icon, description, color = "blue", index = 0, onClick }: StatCardProps) {
  const c = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.25, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm bg-white dark:bg-gray-800 p-5 flex flex-col items-center text-center",
        onClick && "cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 hover:-translate-y-0.5 transition-all duration-150"
      )}
    >
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", c.bg)}>
        <Icon className={cn("h-5 w-5", c.icon)} />
      </div>
      <div className="mt-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </motion.div>
  );
}
