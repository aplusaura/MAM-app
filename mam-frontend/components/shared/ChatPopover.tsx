"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { MessageSquare, Send, X } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { formatDistanceToNow, isToday } from "date-fns";
import Link from "next/link";
import { playSound } from "@/lib/sounds";
import type { Conversation, DirectMessage } from "@/types";

interface User { id: number; email: string; full_name?: string | null; }

export function ChatPopover() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activePartnerId, setActivePartnerId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: users } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => get("/users/"),
    enabled: open,
    staleTime: 60_000,
  });

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => get("/messages/conversations"),
    refetchInterval: 30_000,
  });

  const { data: messages } = useQuery<DirectMessage[]>({
    queryKey: ["messages", activePartnerId],
    queryFn: () => get(`/messages/${activePartnerId}`),
    enabled: !!activePartnerId && open,
    refetchInterval: open ? 15_000 : false,
  });

  const sendMutation = useMutation({
    mutationFn: () => post(`/messages/${activePartnerId}`, { content: text }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", activePartnerId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const unreadCount = useMemo(
    () => (conversations ?? []).reduce((s, c) => s + (c.unread ?? 0), 0),
    [conversations]
  );

  const prevUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevUnreadRef.current !== null && unreadCount > prevUnreadRef.current) {
      playSound("notification");
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const partnerName = (id: number) => {
    const u = users?.find((u) => u.id === id);
    return u?.full_name || u?.email || `User #${id}`;
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    if (isToday(d)) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    return formatDistanceToNow(d, { addSuffix: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && text.trim()) {
      e.preventDefault();
      sendMutation.mutate();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
        aria-label="Messages"
      >
        <MessageSquare className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col"
          style={{ height: "460px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Messages</span>
            <div className="flex items-center gap-2">
              <Link href="/messages" className="text-xs text-blue-600 hover:underline" onClick={() => setOpen(false)}>
                Open full →
              </Link>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            </div>
          </div>

          {activePartnerId ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Thread header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
                <button
                  onClick={() => setActivePartnerId(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                >
                  ← Back
                </button>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">
                  {partnerName(activePartnerId)}
                </span>
              </div>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {(messages ?? []).map((msg) => {
                  const isMe = msg.from_user_id === me?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-sm ${
                          isMe
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-0.5 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              {/* Input */}
              <div className="p-2 border-t border-gray-100 dark:border-gray-700 shrink-0 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => text.trim() && sendMutation.mutate()}
                  disabled={!text.trim() || sendMutation.isPending}
                  className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Conversations list */
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
              {(conversations ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No conversations yet</p>
              ) : (
                (conversations ?? []).map((conv) => (
                  <button
                    key={conv.partner_id}
                    onClick={() => setActivePartnerId(conv.partner_id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                        {partnerName(conv.partner_id).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {partnerName(conv.partner_id)}
                          </span>
                          {conv.last_at && (
                            <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                              {formatTime(conv.last_at)}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{conv.last_message}</p>
                        )}
                      </div>
                      {conv.unread > 0 && (
                        <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {conv.unread > 9 ? "9+" : conv.unread}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
