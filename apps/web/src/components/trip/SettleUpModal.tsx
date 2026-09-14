"use client";

import React, { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface Member {
  id: string;
  user_id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    payment_handles?: any;
  };
}

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  baseCurrency: string;
  members: Member[];
  initialFromUserId?: string;
  initialToUserId?: string;
  initialAmount?: number;
  onSettled: () => void;
}

export function SettleUpModal({
  isOpen,
  onClose,
  tripId,
  baseCurrency,
  members,
  initialFromUserId,
  initialToUserId,
  initialAmount,
  onSettled,
}: SettleUpModalProps) {
  const [fromUserId, setFromUserId] = useState(initialFromUserId || members[0]?.user_id || "");
  const [toUserId, setToUserId] = useState(
    initialToUserId || (members.length > 1 ? members[1]?.user_id : members[0]?.user_id || "")
  );
  const [amount, setAmount] = useState<string>(initialAmount ? initialAmount.toFixed(2) : "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  if (!isOpen) return null;

  const recipientMember = members.find((m) => m.user_id === toUserId);
  const paymentHandles = recipientMember?.user?.payment_handles;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromUserId === toUserId) {
      setError("Payer and receiver cannot be the same person.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid settlement amount.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase.from("settlements").insert({
        trip_id: tripId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount: numAmount,
        currency: baseCurrency,
        status: "completed",
        notes: notes || null,
        settled_at: new Date().toISOString(),
      });

      if (insertErr) throw insertErr;

      onSettled();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record settlement");
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
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">Record Settlement</h3>
            <p className="text-xs text-secondary">Mark debt as paid between members</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-semibold text-secondary mb-1">Paid By (Debtor)</label>
              <select
                value={fromUserId}
                onChange={(e) => setFromUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.name || m.user?.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-secondary mb-1">Paid To (Creditor)</label>
              <select
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.name || m.user?.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label={`Amount (${baseCurrency}) *`}
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />

          {paymentHandles && Object.keys(paymentHandles).length > 0 && (
            <div className="p-3.5 rounded-2xl bg-surface-subtle border border-subtle text-xs space-y-1.5">
              <span className="font-semibold text-secondary block">Recipient Payment Handles:</span>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {paymentHandles.wise && <span className="text-accent font-medium">Wise: {paymentHandles.wise}</span>}
                {paymentHandles.revolut && <span className="text-accent font-medium">Revolut: {paymentHandles.revolut}</span>}
                {paymentHandles.venmo && <span className="text-accent font-medium">Venmo: @{paymentHandles.venmo}</span>}
                {paymentHandles.duitnow && <span className="text-accent font-medium">DuitNow: {paymentHandles.duitnow}</span>}
              </div>
            </div>
          )}

          <Input
            label="Notes (Optional)"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Bank transfer reference #1234"
          />

          <div className="pt-3 flex gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              size="md"
              className="flex-1"
            >
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
