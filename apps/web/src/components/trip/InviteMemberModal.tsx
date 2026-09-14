"use client";

import React, { useState } from "react";
import { X, Copy, Check, Mail, Share2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  inviteCode: string;
  onInviteSent?: () => void;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  tripId,
  tripName,
  inviteCode,
  onInviteSent,
}: InviteMemberModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  if (!isOpen) return null;

  const joinLink = typeof window !== "undefined" ? `${window.location.origin}/join/${inviteCode}` : "";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Must be logged in to invite");

      const { error } = await supabase
        .from("trip_invitations")
        .insert({
          trip_id: tripId,
          email: email.trim().toLowerCase(),
          invited_by: userData.user.id,
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("An invitation has already been sent to this email.");
        }
        throw error;
      }

      setMessage({
        type: "success",
        text: `Invitation sent to ${email}! If they have an account, they'll see it immediately.`,
      });
      setEmail("");
      if (onInviteSent) onInviteSent();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to send invitation.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-full"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
            <Share2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Invite to {tripName}</h3>
            <p className="text-xs text-slate-400">Share with travel friends</p>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 border ${
              message.type === "success"
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                : "bg-red-950/40 border-red-800/60 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Trip Invite Code</label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-base tracking-widest text-indigo-400 font-bold text-center">
                {inviteCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedCode ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Universal Join Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={joinLink}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 truncate focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedLink ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Or Invite by Email</label>
            <form onSubmit={handleSendInvite} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
                <Mail size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Invite"}
              </button>
            </form>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Registered users will receive an in-app notification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
