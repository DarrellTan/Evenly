"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Check, Users, Receipt, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  reference_id?: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function NotificationBell({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const loadNotifications = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    loadNotifications();

    // Realtime subscription for incoming notifications
    const channel = supabase
      .channel(`user-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark notifications as read", err);
    }
  };

  const markSingleAsRead = async (id: string) => {
    try {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark single notification as read", err);
    }
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Circular Bell Button with Badge */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className="relative w-9 h-9 rounded-full bg-surface-subtle hover:bg-surface border border-subtle flex items-center justify-center text-primary transition-all duration-150 active:scale-95"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-canvas shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-elevated border border-subtle shadow-apple-xl p-2 z-50 animate-fade-in text-primary">
          <div className="flex items-center justify-between px-3 py-2 border-b border-subtle mb-1">
            <span className="font-bold text-xs text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-accent hover:opacity-80 transition flex items-center gap-1"
              >
                <Check size={12} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => {
                const targetUrl =
                  notif.type === "invite" && notif.reference_id
                    ? `/trips/${notif.reference_id}`
                    : notif.reference_id
                    ? `/trips/${notif.reference_id}`
                    : "#";

                return (
                  <Link
                    key={notif.id}
                    href={targetUrl}
                    onClick={() => {
                      markSingleAsRead(notif.id);
                      setIsOpen(false);
                    }}
                    className={`block p-2.5 rounded-xl transition-all duration-150 text-xs ${
                      !notif.read
                        ? "bg-surface-subtle font-medium border border-subtle"
                        : "hover:bg-surface-subtle text-secondary"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-surface border border-subtle text-accent shrink-0 mt-0.5">
                        {notif.type === "invite" ? (
                          <Users size={13} />
                        ) : notif.type === "expense_added" ? (
                          <Receipt size={13} />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-primary leading-snug">{notif.message}</p>
                        <span className="text-[10px] text-muted block mt-0.5">
                          {new Date(notif.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
