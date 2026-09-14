"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, Receipt, Users, DollarSign, Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  SUPPORTED_CURRENCIES,
  calculateItemizedSplit,
  convertCurrency,
  type ExpenseCategory,
} from "@evenly/shared";

interface Member {
  id: string;
  user_id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  baseCurrency: string;
  members: Member[];
  onExpenseCreated: () => void;
}

interface SubItem {
  id: string;
  name: string;
  amount: number;
  quantity: number;
  assignedUserIds: string[];
}

export function AddExpenseModal({
  isOpen,
  onClose,
  tripId,
  baseCurrency,
  members,
  onExpenseCreated,
}: AddExpenseModalProps) {
  const [splitMode, setSplitMode] = useState<"simple" | "itemized">("simple");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [paidByUserId, setPaidByUserId] = useState<string>(members[0]?.user_id || "");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    members.map((m) => m.user_id)
  );

  // Itemized fields
  const [items, setItems] = useState<SubItem[]>([
    { id: "1", name: "", amount: 0, quantity: 1, assignedUserIds: members.map((m) => m.user_id) },
  ]);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(0);
  const [splitTaxEqually, setSplitTaxEqually] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(),
        name: "",
        amount: 0,
        quantity: 1,
        assignedUserIds: members.map((m) => m.user_id),
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((i) => i.id !== id));
    }
  };

  const toggleMemberForItem = (itemId: string, userId: string) => {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.assignedUserIds.includes(userId);
        const updated = exists
          ? item.assignedUserIds.filter((id) => id !== userId)
          : [...item.assignedUserIds, userId];
        return { ...item, assignedUserIds: updated };
      })
    );
  };

  const totalFromItems = items.reduce((sum, item) => sum + (item.amount || 0) * (item.quantity || 1), 0);
  const serviceChargeAmount = totalFromItems * (serviceChargePercent / 100);
  const taxAmount = (totalFromItems + serviceChargeAmount) * (taxPercent / 100);
  const grandTotalItemized = totalFromItems + serviceChargeAmount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const finalAmount =
        splitMode === "simple" ? parseFloat(amount) : Math.round(grandTotalItemized * 100) / 100;

      if (isNaN(finalAmount) || finalAmount <= 0) {
        throw new Error("Please enter a valid expense amount.");
      }

      // Convert currency to base currency
      const baseCurrencyAmount = convertCurrency(finalAmount, currency, baseCurrency);
      const exchangeRate = finalAmount > 0 ? baseCurrencyAmount / finalAmount : 1.0;

      // 1. Insert parent Expense
      const { data: expense, error: expError } = await supabase
        .from("expenses")
        .insert({
          trip_id: tripId,
          title,
          amount: finalAmount,
          currency,
          exchange_rate: exchangeRate,
          base_currency_amount: baseCurrencyAmount,
          category,
          paid_by_user_id: paidByUserId,
          include_service_charge: serviceChargePercent > 0,
          service_charge_percent: serviceChargePercent,
          include_tax: taxPercent > 0,
          tax_percent: taxPercent,
          split_tax_equally: splitTaxEqually,
        })
        .select()
        .single();

      if (expError) throw expError;

      // 2. Insert Items & Assignments if itemized
      if (splitMode === "itemized") {
        for (const item of items) {
          if (!item.name || item.amount <= 0) continue;

          const { data: insertedItem, error: itemErr } = await supabase
            .from("expense_items")
            .insert({
              expense_id: expense.id,
              name: item.name,
              amount: item.amount,
              quantity: item.quantity,
            })
            .select()
            .single();

          if (itemErr) throw itemErr;

          if (item.assignedUserIds.length > 0) {
            const splitPercentage = 1 / item.assignedUserIds.length;
            const assignmentRows = item.assignedUserIds.map((uId) => ({
              item_id: insertedItem.id,
              user_id: uId,
              percentage: splitPercentage,
            }));

            const { error: assignErr } = await supabase
              .from("expense_assignments")
              .insert(assignmentRows);

            if (assignErr) throw assignErr;
          }
        }
      } else {
        // Simple mode: create 1 dummy item and assign to selected members equally
        const { data: dummyItem, error: dErr } = await supabase
          .from("expense_items")
          .insert({
            expense_id: expense.id,
            name: title,
            amount: finalAmount,
            quantity: 1,
          })
          .select()
          .single();

        if (dErr) throw dErr;

        const assignedList = selectedMemberIds.length > 0 ? selectedMemberIds : members.map((m) => m.user_id);
        const splitPercentage = 1 / assignedList.length;
        const assignmentRows = assignedList.map((uId) => ({
          item_id: dummyItem.id,
          user_id: uId,
          percentage: splitPercentage,
        }));

        const { error: aErr } = await supabase.from("expense_assignments").insert(assignmentRows);
        if (aErr) throw aErr;
      }

      onExpenseCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-200 p-1 rounded-full"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
            <Receipt size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Add Expense</h3>
            <p className="text-xs text-slate-400">Log a group expenditure or restaurant bill</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs mb-4">
            {error}
          </div>
        )}

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => setSplitMode("simple")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              splitMode === "simple"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users size={14} />
            <span>Simple Split</span>
          </button>
          <button
            type="button"
            onClick={() => setSplitMode("itemized")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              splitMode === "itemized"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calculator size={14} />
            <span>Itemized Receipt</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner at Ichiran Ramen"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Currency *</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize"
              >
                {["food", "transport", "accommodation", "activity", "shopping", "groceries", "flights", "other"].map((cat) => (
                  <option key={cat} value={cat} className="capitalize">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Paid By *</label>
            <select
              value={paidByUserId}
              onChange={(e) => setPaidByUserId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user?.name || m.user?.email}
                </option>
              ))}
            </select>
          </div>

          {splitMode === "simple" ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Total Amount *</label>
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Split Equally Between</label>
                <div className="grid grid-cols-2 gap-2">
                  {members.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.user_id);
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (selectedMemberIds.length > 1) {
                              setSelectedMemberIds(selectedMemberIds.filter((id) => id !== m.user_id));
                            }
                          } else {
                            setSelectedMemberIds([...selectedMemberIds, m.user_id]);
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border transition ${
                          isSelected
                            ? "bg-indigo-950/60 border-indigo-600/60 text-indigo-200"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border ${isSelected ? "bg-indigo-500 border-indigo-400" : "border-slate-600"}`} />
                        <span className="truncate">{m.user?.name || m.user?.email}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Receipt Items</span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  <Plus size={13} />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Item name (e.g. Steak)"
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].name = e.target.value;
                          setItems(updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.amount || ""}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].amount = parseFloat(e.target.value) || 0;
                          setItems(updated);
                        }}
                        className="w-24 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Assigned to:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {members.map((m) => {
                          const isAssigned = item.assignedUserIds.includes(m.user_id);
                          return (
                            <button
                              key={m.user_id}
                              type="button"
                              onClick={() => toggleMemberForItem(item.id, m.user_id)}
                              className={`px-2 py-0.5 rounded-md text-[10px] border transition ${
                                isAssigned
                                  ? "bg-indigo-900/60 border-indigo-500 text-indigo-200"
                                  : "bg-slate-900 border-slate-800 text-slate-500"
                              }`}
                            >
                              {m.user?.name?.split(" ")[0] || m.user?.email?.split("@")[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Service Charge (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={serviceChargePercent || ""}
                    onChange={(e) => setServiceChargePercent(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 10"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tax (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={taxPercent || ""}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 8"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Calculated:</span>
                <span className="font-bold text-white text-sm">
                  {currency} {grandTotalItemized.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
