"use client";

import React, { useState } from "react";
import { X, CheckCircle2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-full"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Record Settlement</h3>
            <p className="text-xs text-slate-400">Mark debt as paid between members</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Paid By (Debtor)</label>
              <select
                value={fromUserId}
                onChange={(e) => setFromUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.name || m.user?.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Paid To (Creditor)</label>
              <select
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user?.name || m.user?.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Amount ({baseCurrency})
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {paymentHandles && Object.keys(paymentHandles).length > 0 && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <span className="font-semibold text-slate-400 block">Recipient Payment Handles:</span>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {paymentHandles.wise && <span className="text-indigo-400">Wise: {paymentHandles.wise}</span>}
                {paymentHandles.revolut && <span className="text-indigo-400">Revolut: {paymentHandles.revolut}</span>}
                {paymentHandles.venmo && <span className="text-indigo-400">Venmo: @{paymentHandles.venmo}</span>}
                {paymentHandles.duitnow && <span className="text-indigo-400">DuitNow: {paymentHandles.duitnow}</span>}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bank transfer reference #1234"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition disabled:opacity-50"
            >
              {loading ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
