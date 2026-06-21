import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 180000, // 3 minutes — AI endpoints can take 60-90s
});

// Attach token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Singleton refresh promise to prevent concurrent refresh race conditions
let refreshPromise: Promise<string> | null = null;
// Guard to prevent multiple redirect-to-login navigations
let isRedirecting = false;

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          // Reuse in-flight refresh to avoid race condition
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${API_BASE}/auth/refresh`, { refresh_token: refresh })
              .then((r) => {
                localStorage.setItem("access_token", r.data.access_token);
                localStorage.setItem("refresh_token", r.data.refresh_token);
                isRedirecting = false;
                return r.data.access_token;
              })
              .finally(() => { refreshPromise = null; });
          }
          const newToken = await refreshPromise;
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          if (!isRedirecting) {
            isRedirecting = true;
            window.location.href = "/login";
          }
        }
      } else {
        if (!isRedirecting) {
          isRedirecting = true;
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);

// Typed helpers
export const get = <T>(url: string, params?: object) =>
  api.get<T>(url, { params }).then((r) => r.data);

export const post = <T>(url: string, data?: object) =>
  api.post<T>(url, data).then((r) => r.data);

export const put = <T>(url: string, data?: object) =>
  api.put<T>(url, data).then((r) => r.data);

export const patch = <T>(url: string, data?: object) =>
  api.patch<T>(url, data).then((r) => r.data);

export const del = <T>(url: string) => api.delete<T>(url).then((r) => r.data);

// Builds a full media URL from a relative path (e.g. /uploads/employees/foo.jpg)
export const getMediaUrl = (path: string): string => {
  const base = (process.env.NEXT_PUBLIC_API_URL || "")
    .replace(/\/api\/v1\/?$/, "");
  return `${base}${path}`;
};

// Extracts a user-friendly error message from axios errors
export function getErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { detail?: unknown; message?: string; msg?: string } }; message?: string };
  const data = e?.response?.data;
  const detail = data?.detail;
  if (detail) {
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (typeof first === "object" && first !== null && "msg" in first) {
        const msgs = detail.map((d: { msg?: string; loc?: string[] }) => {
          const field = d.loc ? d.loc[d.loc.length - 1] : "";
          return field ? `${field}: ${d.msg}` : d.msg;
        });
        return msgs.join(", ");
      }
      return String(first);
    }
    return JSON.stringify(detail);
  }
  if (data?.message) return data.message;
  if (data?.msg) return data.msg;
  if (e?.response?.status) return `Server error (${e.response.status})`;
  if (e?.message) return e.message;
  return "An unexpected error occurred";
}
