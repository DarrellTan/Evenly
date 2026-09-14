"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, Receipt, Users, Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  SUPPORTED_CURRENCIES,
  convertCurrency,
  type ExpenseCategory,
} from "@evenly/shared";
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

      const baseCurrencyAmount = convertCurrency(finalAmount, currency, baseCurrency);
      const exchangeRate = finalAmount > 0 ? baseCurrencyAmount / finalAmount : 1.0;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-elevated border border-subtle p-7 shadow-apple-xl text-primary max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted hover:text-primary p-1.5 rounded-full hover:bg-surface-subtle transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="p-2.5 rounded-2xl bg-accent-subtle text-accent border border-accent-border/40 shadow-apple-sm">
            <Receipt size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">Add Expense</h3>
            <p className="text-xs text-secondary">Log a group expenditure or restaurant bill</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs mb-4">
            {error}
          </div>
        )}

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-surface-subtle border border-subtle mb-5">
          <button
            type="button"
            onClick={() => setSplitMode("simple")}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ${
              splitMode === "simple"
                ? "bg-surface text-primary shadow-apple-sm"
                : "text-secondary hover:text-primary"
            }`}
          >
            <Users size={14} className={splitMode === "simple" ? "text-accent" : ""} />
            <span>Simple Split</span>
          </button>
          <button
            type="button"
            onClick={() => setSplitMode("itemized")}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ${
              splitMode === "itemized"
                ? "bg-surface text-primary shadow-apple-sm"
                : "text-secondary hover:text-primary"
            }`}
          >
            <Calculator size={14} className={splitMode === "itemized" ? "text-accent" : ""} />
            <span>Itemized Receipt</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          <Input
            label="Expense Title *"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Dinner at Ichiran Ramen"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Currency *</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 capitalize"
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
            <label className="block text-xs font-semibold text-secondary mb-1.5">Paid By *</label>
            <select
              value={paidByUserId}
              onChange={(e) => setPaidByUserId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
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
              <Input
                label="Total Amount *"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />

              <div>
                <label className="block text-xs font-semibold text-secondary mb-2">Split Equally Between</label>
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
                        className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 border transition-all duration-150 ${
                          isSelected
                            ? "bg-accent-subtle border-accent/40 text-accent font-medium shadow-apple-sm"
                            : "bg-surface border-subtle text-secondary"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "bg-accent border-accent text-white" : "border-subtle"}`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
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
                <span className="text-xs font-semibold text-primary">Receipt Items</span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 text-xs text-accent font-semibold hover:opacity-80 transition"
                >
                  <Plus size={13} />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-surface-subtle border border-subtle space-y-2.5">
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
                        className="flex-1 px-3 py-1.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent"
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
                        className="w-24 px-3 py-1.5 rounded-xl bg-surface border border-subtle text-xs text-primary focus:outline-none focus:border-accent"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-muted hover:text-rose-500 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-muted block mb-1.5 font-medium">Assigned to:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {members.map((m) => {
                          const isAssigned = item.assignedUserIds.includes(m.user_id);
                          return (
                            <button
                              key={m.user_id}
                              type="button"
                              onClick={() => toggleMemberForItem(item.id, m.user_id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all duration-150 ${
                                isAssigned
                                  ? "bg-accent text-white border-accent shadow-apple-sm"
                                  : "bg-surface border-subtle text-secondary"
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
                <Input
                  label="Service Charge (%)"
                  type="number"
                  step="0.1"
                  value={serviceChargePercent || ""}
                  onChange={(e) => setServiceChargePercent(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 10"
                />
                <Input
                  label="Tax (%)"
                  type="number"
                  step="0.1"
                  value={taxPercent || ""}
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 8"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-accent-subtle border border-accent-border/40 flex justify-between items-center text-xs">
                <span className="text-secondary font-medium">Total Calculated:</span>
                <span className="font-bold text-accent text-sm">
                  {currency} {grandTotalItemized.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-subtle flex gap-2.5">
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
              {loading ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
