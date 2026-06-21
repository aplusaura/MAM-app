"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { Send, MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { DirectMessage, Conversation } from "@/types";

interface Contact {
  user_id: number;
  full_name: string;
  job_title: string | null;
  profile_image_url: string | null;
}

export default function MessagesPage() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const [activePartnerId, setActivePartnerId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["message-contacts"],
    queryFn: () => get("/messages/contacts"),
    staleTime: 60000,
  });

  const nameByUserId = Object.fromEntries((contacts ?? []).map((c) => [c.user_id, c.full_name]));

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
    mutationFn: () => {
      const content = text.trim();
      if (!content) throw new Error("Message is empty");
      if (!activePartnerId) throw new Error("No partner selected");
      return post(`/messages/${activePartnerId}`, { content });
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", activePartnerId] });
      refetchConvs();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      const detail = e?.response?.data?.detail || e?.message || "Failed to send message";
      toast.error(`Error: ${detail} (${e?.response?.status ?? "network"})`);
      console.error("Send message error:", err);
    },
  });

  const deleteMsgMutation = useMutation({
    mutationFn: (msgId: number) => del(`/messages/message/${msgId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", activePartnerId] });
      refetchConvs();
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: () => del(`/messages/chat/${activePartnerId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", activePartnerId] });
      refetchConvs();
      setActivePartnerId(null);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const partnerName = (id: number) => {
    const fromContacts = nameByUserId[id];
    if (fromContacts) return fromContacts;
    const conv = (conversations ?? []).find((c) => c.partner_id === id);
    return conv?.partner_name ?? `User #${id}`;
  };

  const conversationPartnerIds = new Set((conversations ?? []).map((c) => c.partner_id));
  const otherContacts = (contacts ?? []).filter((c) => !conversationPartnerIds.has(c.user_id));

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
                onClick={() => {
                  setActivePartnerId(conv.partner_id);
                  setTimeout(() => refetchConvs(), 500);
                }}
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
            {/* New conversation starters — contacts without existing chats */}
            {otherContacts.map((c) => (
              <button
                key={c.user_id}
                onClick={() => setActivePartnerId(c.user_id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${activePartnerId === c.user_id ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {c.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-xs text-gray-600 truncate">{c.full_name}</p>
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
              <p className="text-sm font-semibold text-gray-800 flex-1">{partnerName(activePartnerId)}</p>
              {me?.is_superuser && (
                <button
                  onClick={() => {
                    if (confirm("Delete entire conversation? This cannot be undone.")) {
                      deleteChatMutation.mutate();
                    }
                  }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                  title="Delete entire conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete chat
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {(messages ?? []).map((msg) => {
                const isMe = msg.from_user_id === me?.id;
                const deleted = msg.is_deleted;
                return (
                  <div key={msg.id} className={`flex group ${isMe ? "justify-end" : "justify-start"}`}>
                    {isMe && !deleted && (
                      <button
                        onClick={() => deleteMsgMutation.mutate(msg.id)}
                        className="opacity-0 group-hover:opacity-100 mr-1 self-center p-1 rounded hover:bg-gray-100 transition-opacity"
                        title="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                    <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${
                      deleted
                        ? "bg-gray-100 text-gray-400 italic"
                        : isMe
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"
                    }`}>
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe && !deleted ? "text-blue-200" : "text-gray-400"}`}>
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
                onSubmit={(e) => {
                  e.preventDefault();
                  if (text.trim() && activePartnerId) sendMutation.mutate();
                }}
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
              {sendMutation.isError && (
                <p className="text-xs text-red-500 mt-1">
                  {(() => {
                    const e = sendMutation.error as { response?: { status?: number; data?: { detail?: string } }; message?: string };
                    return e?.response?.data?.detail || e?.response?.status || e?.message || "Unknown error";
                  })()}
                </p>
              )}
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
