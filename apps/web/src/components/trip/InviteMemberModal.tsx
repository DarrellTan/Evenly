"use client";

import React, { useState } from "react";
import { X, Copy, Check, Mail, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-elevated border border-subtle p-7 shadow-apple-xl text-primary">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted hover:text-primary p-1.5 rounded-full hover:bg-surface-subtle transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="p-2.5 rounded-2xl bg-accent-subtle text-accent border border-accent-border/40 shadow-apple-sm">
            <Share2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">Invite to {tripName}</h3>
            <p className="text-xs text-secondary">Share with travel friends</p>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-2xl text-xs mb-5 border ${
              message.type === "success"
                ? "bg-accent-subtle border-accent-border/60 text-accent"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Trip Invite Code</label>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-2.5 rounded-xl bg-surface-subtle border border-subtle font-mono text-base tracking-widest text-accent font-bold text-center">
                {inviteCode}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyCode}
                icon={copiedCode ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
              >
                <span>{copiedCode ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Universal Join Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={joinLink}
                className="flex-1 px-3 py-2 rounded-xl bg-surface-subtle border border-subtle text-xs text-secondary truncate focus:outline-none"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                icon={copiedLink ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
              >
                <span>{copiedLink ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </div>

          <div className="pt-3 border-t border-subtle">
            <label className="block text-xs font-semibold text-secondary mb-1.5">Or Invite by Email</label>
            <form onSubmit={handleSendInvite} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  icon={<Mail size={14} />}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                size="sm"
                className="shrink-0"
              >
                {loading ? "Sending..." : "Send Invite"}
              </Button>
            </form>
            <p className="text-[11px] text-muted mt-1.5">
              Registered users will receive an in-app notification instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
