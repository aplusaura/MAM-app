"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { getMediaUrl } from "@/lib/api";
import { Trophy, Star, CheckSquare, Medal } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "@/hooks/useTranslation";

interface LeaderboardEntry {
  rank: number;
  id: number;
  full_name: string;
  job_title?: string;
  profile_image_url?: string | null;
  tasks_done: number;
  avg_score?: number | null;
  performance_score?: number | null;
}

const RANK_COLORS = ["bg-yellow-400 text-yellow-900", "bg-gray-300 text-gray-700", "bg-amber-600 text-amber-100"];
const RANK_ICONS = [Trophy, Medal, Medal];

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: () => get("/employees/leaderboard"),
    staleTime: 60 * 1000,
  });

  const now = new Date();
  const monthName = format(now, "MMMM yyyy");

  return (
    <>
      <TopBar title={t("leaderboard")} />
      <main className="flex-1 p-3 sm:p-6 bg-gray-50 min-h-full">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h2 className="text-base font-semibold text-gray-800">Top Performers</h2>
            </div>
            <span className="text-xs text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full">{monthName}</span>
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 h-16 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && (!data || data.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-16">{t("noData")}</p>
          )}

          {/* Top 3 podium */}
          {!isLoading && data && data.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[data[1], data[0], data[2]].map((entry, i) => {
                if (!entry) return null;
                const positions = [1, 0, 2]; // 2nd, 1st, 3rd
                const pos = positions[i];
                const RankIcon = RANK_ICONS[pos];
                const initials = entry.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                const photoUrl = entry.profile_image_url
                  ? (entry.profile_image_url.startsWith("http") ? entry.profile_image_url : getMediaUrl(entry.profile_image_url))
                  : null;
                return (
                  <div key={entry.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center ${pos === 0 ? "ring-2 ring-yellow-300" : ""}`}>
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${RANK_COLORS[pos]}`}>
                      <RankIcon className="h-4 w-4" />
                    </div>
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold mb-2 shrink-0">
                      {photoUrl ? <img src={photoUrl} alt={entry.full_name} className="h-full w-full object-cover" /> : initials}
                    </div>
                    <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{entry.full_name}</p>
                    <p className="text-[10px] text-gray-400">{entry.job_title ?? ""}</p>
                    <div className="mt-2 flex flex-col items-center gap-1">
                      {entry.performance_score != null && (
                        <div className="flex items-center gap-1">
                          <span className={`text-base font-extrabold ${entry.performance_score >= 80 ? "text-emerald-600" : entry.performance_score >= 60 ? "text-blue-600" : "text-amber-600"}`}>
                            {entry.performance_score}
                          </span>
                          <span className="text-[10px] text-gray-400">/100</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-emerald-600 font-bold">{entry.tasks_done}</span>
                        <span className="text-gray-400">tasks</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full ranking */}
          {!isLoading && data && data.map((entry) => {
            const initials = entry.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            const photoUrl = entry.profile_image_url
              ? (entry.profile_image_url.startsWith("http") ? entry.profile_image_url : getMediaUrl(entry.profile_image_url))
              : null;
            return (
              <div key={entry.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
                <span className={`text-lg font-bold w-8 text-center ${entry.rank <= 3 ? ["text-yellow-500", "text-gray-400", "text-amber-600"][entry.rank - 1] : "text-gray-400"}`}>
                  #{entry.rank}
                </span>
                <div className="h-10 w-10 rounded-full overflow-hidden bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {photoUrl ? <img src={photoUrl} alt={entry.full_name} className="h-full w-full object-cover" /> : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{entry.full_name}</p>
                  <p className="text-xs text-gray-400">{entry.job_title ?? "—"}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {entry.performance_score != null && (
                    <div className="text-center">
                      <p className={`text-sm font-bold ${entry.performance_score >= 80 ? "text-emerald-600" : entry.performance_score >= 60 ? "text-blue-600" : "text-amber-600"}`}>
                        {entry.performance_score}<span className="text-[10px] text-gray-400 font-normal">/100</span>
                      </p>
                      <p className="text-[10px] text-gray-400">performance</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm font-bold text-emerald-600">{entry.tasks_done}</p>
                    <p className="text-[10px] text-gray-400">tasks</p>
                  </div>
                  {entry.avg_score != null && (
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                        <p className="text-sm font-bold text-gray-700">{entry.avg_score}</p>
                      </div>
                      <p className="text-[10px] text-gray-400">score</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
