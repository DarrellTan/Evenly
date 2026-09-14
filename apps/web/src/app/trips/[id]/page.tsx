"use client";

import React, { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Plus,
  Share2,
  Receipt,
  Users,
  CheckCircle2,
  Activity,
  ArrowRight,
  TrendingUp,
  Calendar,
  DollarSign,
  Smartphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { simplifyDebts, type SimplifiedDebt, type UserBalance } from "@evenly/shared";
import { AddExpenseModal } from "@/components/trip/AddExpenseModal";
import { SettleUpModal } from "@/components/trip/SettleUpModal";
import { InviteMemberModal } from "@/components/trip/InviteMemberModal";
import { ConnectMobileModal } from "@/components/ConnectMobileModal";

export default function TripDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.id;

  const [trip, setTrip] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"balances" | "expenses" | "activity" | "members">("balances");

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isConnectMobileOpen, setIsConnectMobileOpen] = useState(false);

  // Pre-fill Settle Up state
  const [settlePreFill, setSettlePreFill] = useState<{
    fromUserId?: string;
    toUserId?: string;
    amount?: number;
  }>({});

  const supabase = createClient();

  const loadTripData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUser(userData.user);

      // 1. Fetch Trip
      const { data: tripData, error: tripErr } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

      if (tripErr) throw tripErr;
      setTrip(tripData);

      // 2. Fetch Members
      const { data: memberData } = await supabase
        .from("trip_members")
        .select(`
          id,
          user_id,
          role,
          joined_at,
          user:profiles (
            id,
            name,
            email,
            avatar_url,
            payment_handles
          )
        `)
        .eq("trip_id", tripId);

      setMembers(memberData || []);

      // 3. Fetch Expenses with items & assignments
      const { data: expData } = await supabase
        .from("expenses")
        .select(`
          id,
          title,
          amount,
          currency,
          exchange_rate,
          base_currency_amount,
          category,
          paid_by_user_id,
          date,
          created_at,
          expense_items (
            id,
            name,
            amount,
            quantity,
            expense_assignments (
              user_id,
              percentage
            )
          )
        `)
        .eq("trip_id", tripId)
        .order("date", { ascending: false });

      setExpenses(expData || []);

      // 4. Fetch Settlements
      const { data: settData } = await supabase
        .from("settlements")
        .select(`
          id,
          from_user_id,
          to_user_id,
          amount,
          currency,
          status,
          notes,
          settled_at,
          created_at
        `)
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      setSettlements(settData || []);

      // 5. Fetch Activities
      const { data: actData } = await supabase
        .from("trip_activities")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(30);

      setActivities(actData || []);
    } catch (err) {
      console.error("Failed to load trip data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTripData();

    // Setup Supabase Realtime Channels for live synchronization
    const channel = supabase
      .channel(`trip-realtime:${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `trip_id=eq.${tripId}` },
        () => loadTripData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settlements", filter: `trip_id=eq.${tripId}` },
        () => loadTripData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_members", filter: `trip_id=eq.${tripId}` },
        () => loadTripData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, supabase]);

  // Balance Math & Debt Simplification
  const { totalTripSpent, memberBalances, simplifiedDebts } = useMemo(() => {
    const totalSpent = expenses.reduce((acc, exp) => acc + (exp.base_currency_amount || 0), 0);

    const balancesMap: Record<string, { totalPaid: number; totalOwed: number }> = {};
    members.forEach((m) => {
      balancesMap[m.user_id] = { totalPaid: 0, totalOwed: 0 };
    });

    // 1. Tally Expenses
    expenses.forEach((exp) => {
      const payerId = exp.paid_by_user_id;
      const baseTotal = exp.base_currency_amount || 0;
      if (balancesMap[payerId]) {
        balancesMap[payerId].totalPaid += baseTotal;
      }

      // Calculate consumption
      const items = exp.expense_items || [];
      if (items.length > 0) {
        items.forEach((item: any) => {
          const itemRatio = exp.amount > 0 ? ((item.amount * (item.quantity || 1)) / exp.amount) : 0;
          const itemBaseAmount = itemRatio * baseTotal;

          const assignments = item.expense_assignments || [];
          if (assignments.length > 0) {
            assignments.forEach((as: any) => {
              if (balancesMap[as.user_id]) {
                balancesMap[as.user_id].totalOwed += itemBaseAmount * as.percentage;
              }
            });
          }
        });
      } else {
        // Equal split fallback
        const splitAmount = members.length > 0 ? baseTotal / members.length : 0;
        members.forEach((m) => {
          if (balancesMap[m.user_id]) {
            balancesMap[m.user_id].totalOwed += splitAmount;
          }
        });
      }
    });

    // 2. Tally Settlements
    settlements.forEach((s) => {
      if (s.status === "completed") {
        if (balancesMap[s.from_user_id]) {
          balancesMap[s.from_user_id].totalPaid += s.amount;
        }
        if (balancesMap[s.to_user_id]) {
          balancesMap[s.to_user_id].totalOwed += s.amount;
        }
      }
    });

    const calculatedBalances: UserBalance[] = members.map((m) => {
      const record = balancesMap[m.user_id] || { totalPaid: 0, totalOwed: 0 };
      return {
        user_id: m.user_id,
        total_paid: Math.round(record.totalPaid * 100) / 100,
        total_owed: Math.round(record.totalOwed * 100) / 100,
        net_balance: Math.round((record.totalPaid - record.totalOwed) * 100) / 100,
      };
    });

    // Run greedy simplification
    const debts = simplifyDebts(calculatedBalances, trip?.base_currency || "USD");

    return {
      totalTripSpent: totalSpent,
      memberBalances: calculatedBalances,
      simplifiedDebts: debts,
    };
  }, [expenses, settlements, members, trip]);

  const getUserName = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    return member?.user?.name || member?.user?.email?.split("@")[0] || "Unknown";
  };

  const handleOpenSettle = (fromId?: string, toId?: string, amt?: number) => {
    setSettlePreFill({ fromUserId: fromId, toUserId: toId, amount: amt });
    setIsSettleUpOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-white">Trip not found or access denied</h2>
        <Link href="/" className="text-xs text-indigo-400 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition"
          >
            <ArrowLeft size={14} />
            <span>All Trips</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{trip.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
              {trip.base_currency}
            </span>
          </div>
          {trip.destination && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Compass size={13} className="text-indigo-400" />
              <span>{trip.destination}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition shadow-sm"
          >
            <Share2 size={14} className="text-indigo-400" />
            <span>Invite Code ({trip.invite_code})</span>
          </button>
          <button
            onClick={() => handleOpenSettle()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/50 transition shadow-sm"
          >
            <CheckCircle2 size={14} />
            <span>Settle Up</span>
          </button>
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30"
          >
            <Plus size={15} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab("balances")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            activeTab === "balances"
              ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp size={14} />
          <span>Balances & Debts</span>
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            activeTab === "expenses"
              ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Receipt size={14} />
          <span>Expenses ({expenses.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            activeTab === "activity"
              ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity size={14} />
          <span>Activity</span>
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
            activeTab === "members"
              ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users size={14} />
          <span>Members ({members.length})</span>
        </button>
      </div>

      {/* Tab 1: Balances & Simplified Debts */}
      {activeTab === "balances" && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
              <span className="text-xs font-semibold text-slate-400">Total Group Spent</span>
              <p className="text-2xl font-black text-white mt-1">
                {trip.base_currency} {totalTripSpent.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
              <span className="text-xs font-semibold text-slate-400">Total Expenses Logged</span>
              <p className="text-2xl font-black text-indigo-400 mt-1">{expenses.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
              <span className="text-xs font-semibold text-slate-400">Simplified Debts Required</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{simplifiedDebts.length} Transfers</p>
            </div>
          </div>

          {/* Simplified Debt Solver Recommendations */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Smart Debt Simplification</h2>
                <p className="text-xs text-slate-400">
                  Minimum bank transfers required to settle all debts in {trip.base_currency}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
                Greedy Min-Cash-Flow
              </span>
            </div>

            {simplifiedDebts.length === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl">
                ✨ All debts are completely settled! Everyone is even.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {simplifiedDebts.map((debt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 flex items-center justify-between group hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xs">
                        <span className="font-bold text-white">{getUserName(debt.from_user_id)}</span>
                        <span className="text-slate-500 mx-1.5">owes</span>
                        <span className="font-bold text-indigo-400">{getUserName(debt.to_user_id)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-black text-white text-sm">
                        {debt.currency} {debt.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleOpenSettle(debt.from_user_id, debt.to_user_id, debt.amount)}
                        className="py-1 px-2.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                      >
                        Settle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Member Net Balances Table */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Member Balances</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">Member</th>
                    <th className="pb-3 font-semibold">Total Paid</th>
                    <th className="pb-3 font-semibold">Total Consumed</th>
                    <th className="pb-3 font-semibold text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {memberBalances.map((b) => {
                    const isPositive = b.net_balance > 0;
                    const isZero = Math.abs(b.net_balance) < 0.01;
                    return (
                      <tr key={b.user_id} className="text-slate-300">
                        <td className="py-3 font-semibold text-white">{getUserName(b.user_id)}</td>
                        <td className="py-3">
                          {trip.base_currency} {b.total_paid.toFixed(2)}
                        </td>
                        <td className="py-3">
                          {trip.base_currency} {b.total_owed.toFixed(2)}
                        </td>
                        <td
                          className={`py-3 text-right font-bold ${
                            isZero
                              ? "text-slate-400"
                              : isPositive
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {trip.base_currency} {b.net_balance.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Expenses List */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Expense Ledger</h2>
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
            >
              <Plus size={14} />
              <span>Add Expense</span>
            </button>
          </div>

          {expenses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/40">
              <p className="text-xs text-slate-400 mb-4">No expenses recorded yet for this trip.</p>
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
              >
                <Plus size={14} />
                <span>Log First Expense</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                        {exp.category}
                      </span>
                      <h3 className="text-sm font-bold text-white">{exp.title}</h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Paid by <span className="text-indigo-400 font-semibold">{getUserName(exp.paid_by_user_id)}</span> &bull;{" "}
                      {new Date(exp.date).toLocaleDateString()}
                    </p>
                    {exp.expense_items?.length > 1 && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        {exp.expense_items.length} itemized items
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-white">
                      {exp.currency} {exp.amount.toFixed(2)}
                    </div>
                    {exp.currency !== trip.base_currency && (
                      <p className="text-[11px] text-slate-400">
                        &asymp; {trip.base_currency} {exp.base_currency_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Realtime Activity Feed */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Live Activity Feed</h2>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Realtime Active
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-slate-900/40 border border-slate-800">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act.activity_id}
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-800 text-indigo-400">
                      {act.activity_type === "expense_added" ? (
                        <Receipt size={15} />
                      ) : act.activity_type === "settled" ? (
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      ) : (
                        <Users size={15} />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{act.description}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(act.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {act.amount > 0 && (
                    <span className="font-bold text-white">
                      {act.currency} {act.amount.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Members */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Trip Roster ({members.length})</h2>
            <button
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
            >
              <Share2 size={14} />
              <span>Invite Friends</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold text-sm">
                    {m.user?.name?.[0]?.toUpperCase() || m.user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{m.user?.name || "Anonymous"}</span>
                      {m.role === "owner" && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{m.user?.email}</p>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-500">
                  Joined {new Date(m.joined_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        tripId={tripId}
        baseCurrency={trip.base_currency}
        members={members}
        onExpenseCreated={loadTripData}
      />

      <SettleUpModal
        isOpen={isSettleUpOpen}
        onClose={() => setIsSettleUpOpen(false)}
        tripId={tripId}
        baseCurrency={trip.base_currency}
        members={members}
        initialFromUserId={settlePreFill.fromUserId}
        initialToUserId={settlePreFill.toUserId}
        initialAmount={settlePreFill.amount}
        onSettled={loadTripData}
      />

      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        tripId={tripId}
        tripName={trip.name}
        inviteCode={trip.invite_code}
        onInviteSent={loadTripData}
      />

      <ConnectMobileModal
        isOpen={isConnectMobileOpen}
        onClose={() => setIsConnectMobileOpen(false)}
      />
    </div>
  );
}
