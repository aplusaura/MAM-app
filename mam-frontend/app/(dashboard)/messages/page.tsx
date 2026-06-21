"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { Send, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { DirectMessage, Conversation, Employee } from "@/types";

export default function MessagesPage() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const [activePartnerId, setActivePartnerId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => get("/employees/"),
    staleTime: 60000,
  });

  // Only active employees who have a linked user account
  const activeEmployees = (employees ?? []).filter((e) => e.status === "active" && e.user_id);
  // Map user_id → full_name for display
  const nameByUserId = Object.fromEntries(activeEmployees.map((e) => [e.user_id!, e.full_name]));

  const { data: conversations, refetch: refetchConvs } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => get("/messages/conversations"),
    refetchInterval: 10000,
  });

  const { data: messages } = useQuery<DirectMessage[]>({
    queryKey: ["messages", activePartnerId],
    queryFn: () => get(`/messages/${activePartnerId}`),
    enabled: !!activePartnerId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: () => post(`/messages/${activePartnerId}`, { content: text }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", activePartnerId] });
      refetchConvs();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const partnerName = (id: number) => nameByUserId[id] ?? `User #${id}`;

  // Show only active employees (excluding self) as possible conversation partners
  const otherEmployees = activeEmployees.filter((e) => e.user_id !== me?.id);
  const conversationPartnerIds = new Set((conversations ?? []).map((c) => c.partner_id));

  return (
    <>
      <TopBar title="Messages" />
      <main className="flex-1 flex overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r border-gray-100 bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {(conversations ?? []).map((conv) => (
              <button
                key={conv.partner_id}
                onClick={() => setActivePartnerId(conv.partner_id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${activePartnerId === conv.partner_id ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {partnerName(conv.partner_id).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-800 truncate">{partnerName(conv.partner_id)}</p>
                      {conv.unread > 0 && <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center shrink-0">{conv.unread}</span>}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">{conv.last_message}</p>
                  </div>
                </div>
              </button>
            ))}
            {/* New conversation starters — only active employees without existing chats */}
            {otherEmployees.filter((e) => !conversationPartnerIds.has(e.user_id!)).map((e) => (
              <button
                key={e.user_id}
                onClick={() => setActivePartnerId(e.user_id!)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${activePartnerId === e.user_id ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {e.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-xs text-gray-600 truncate">{e.full_name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        {activePartnerId ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                {partnerName(activePartnerId).slice(0, 2).toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-gray-800">{partnerName(activePartnerId)}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {(messages ?? []).map((msg) => {
                const isMe = msg.from_user_id === me?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"}`}>
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!messages || messages.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-8">No messages yet. Say hi!</p>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-white">
              <form
                onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendMutation.mutate(); }}
                className="flex items-center gap-2"
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!text.trim() || sendMutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
