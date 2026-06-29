"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCheck,
  FolderKanban,
  CheckSquare,
  DollarSign,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  Trophy,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useSidebarStore } from "@/store/sidebar";
import { Sidebar, SidebarBody, useSidebar } from "@/components/ui/sidebar";
import { motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/lib/i18n";
import { Languages } from "lucide-react";

const navItems: { href: string; labelKey: TranslationKey; icon: typeof LayoutDashboard; permissions: string[] | null }[] = [
  { href: "/dashboard",  labelKey: "dashboard",   icon: LayoutDashboard, permissions: null },
  { href: "/employees",  labelKey: "employees",    icon: Users,           permissions: ["view_employees"] },
  { href: "/clients",    labelKey: "clients",      icon: Building2,       permissions: ["view_all_clients", "view_assigned_clients"] },
  { href: "/leads",      labelKey: "leads",        icon: UserCheck,       permissions: ["view_all_leads", "view_assigned_leads"] },
  { href: "/projects",   labelKey: "projects",     icon: FolderKanban,    permissions: ["view_all_projects", "view_assigned_projects"] },
  { href: "/tasks",      labelKey: "tasks",        icon: CheckSquare,     permissions: ["view_all_tasks", "view_assigned_tasks"] },
  { href: "/finance",    labelKey: "finance",      icon: DollarSign,      permissions: ["view_finance"] },
  { href: "/reports",    labelKey: "reports",      icon: BarChart3,       permissions: ["view_reports"] },
  { href: "/calendar",    labelKey: "calendar",     icon: CalendarDays,  permissions: null },
  { href: "/content-planner", labelKey: "content",  icon: BookOpen,        permissions: ["view_content"] },
  { href: "/ai",          labelKey: "aiFeatures",  icon: Sparkles,     permissions: ["access_ai_tools"] },
  { href: "/leaderboard", labelKey: "leaderboard",  icon: Trophy,        permissions: null },
  { href: "/settings",    labelKey: "settings",     icon: Settings,      permissions: null },
];

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasPermission } = useAuthStore();
  const { open } = useSidebar();
  const { t, locale, setLocale } = useTranslation();

  const visibleItems = navItems.filter((item) =>
    !item.permissions ? true : item.permissions.some((p) => hasPermission(p))
  );

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <SidebarBody className="justify-between bg-gray-900 border-r border-gray-800">
      {/* Top section: Logo + Nav */}
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden gap-1">

        {/* Logo */}
        <div className="flex items-center gap-2 py-3 mb-2 border-b border-gray-800 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">M</span>
          </div>
          <motion.div
            animate={{ opacity: open ? 1 : 0, display: open ? "block" : "none" }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden whitespace-nowrap"
          >
            <span className="text-white font-bold text-base">MAM</span>
            <span className="text-gray-400 text-xs font-normal ml-1.5">Agency OS</span>
          </motion.div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5">
          {visibleItems.map(({ href, labelKey, icon: Icon }) => {
            const label = t(labelKey);
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <a
                key={href}
                href={href}
                title={!open ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <motion.span
                  animate={{ opacity: open ? 1 : 0, display: open ? "inline" : "none" }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {label}
                </motion.span>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User + Logout */}
      <div className="border-t border-gray-800 pt-3 flex flex-col gap-1 shrink-0">
        {/* User */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <div className="h-7 w-7 rounded-full bg-blue-800 text-blue-200 flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          <motion.div
            animate={{ opacity: open ? 1 : 0, display: open ? "block" : "none" }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="text-sm font-medium text-white truncate max-w-[150px] leading-tight">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-400 truncate max-w-[150px]">
              {user?.is_superuser ? t("superAdmin") : user?.email}
            </p>
          </motion.div>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          title={!open ? t("switchLanguage") : undefined}
          className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <Languages className="h-4 w-4 shrink-0" />
          <motion.span
            animate={{ opacity: open ? 1 : 0, display: open ? "inline" : "none" }}
            transition={{ duration: 0.15 }}
            className="whitespace-nowrap"
          >
            {locale === "en" ? "العربية" : "English"}
          </motion.span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={!open ? t("logout") : undefined}
          className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <motion.span
            animate={{ opacity: open ? 1 : 0, display: open ? "inline" : "none" }}
            transition={{ duration: 0.15 }}
            className="whitespace-nowrap"
          >
            {t("logout")}
          </motion.span>
        </button>

      </div>
    </SidebarBody>
  );
}

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const { mobileOpen, closeMobile } = useSidebarStore();

  const effectiveOpen = open || mobileOpen;
  const effectiveSetOpen: React.Dispatch<React.SetStateAction<boolean>> = (val) => {
    const next = typeof val === "function" ? val(effectiveOpen) : val;
    setOpen(next);
    if (!next) closeMobile();
  };

  return (
    <Sidebar open={effectiveOpen} setOpen={effectiveSetOpen} animate={true}>
      <SidebarContent />
    </Sidebar>
  );
}
