import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { Me } from "@/types";

export function useMe() {
  const { accessToken, setUser, logout } = useAuthStore();

  const query = useQuery<Me>({
    queryKey: ["me", accessToken],
    queryFn: () => get<Me>("/auth/me"),
    enabled: !!accessToken,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);

  useEffect(() => {
    if (!query.error) return;
    // Only logout on 401 (invalid/expired token) — not on 403/5xx/network errors
    const err = query.error as { response?: { status?: number } };
    if (err?.response?.status === 401) logout();
  }, [query.error, logout]);

  return query;
}
