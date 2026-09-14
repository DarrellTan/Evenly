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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { simplifyDebts, type UserBalance } from "@evenly/shared";
import { AddExpenseModal } from "@/components/trip/AddExpenseModal";
import { SettleUpModal } from "@/components/trip/SettleUpModal";
import { InviteMemberModal } from "@/components/trip/InviteMemberModal";
import { ConnectMobileModal } from "@/components/ConnectMobileModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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

      // 3. Fetch Expenses
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

    // Realtime Channels
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

    expenses.forEach((exp) => {
      const payerId = exp.paid_by_user_id;
      const baseTotal = exp.base_currency_amount || 0;
      if (balancesMap[payerId]) {
        balancesMap[payerId].totalPaid += baseTotal;
      }

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
        const splitAmount = members.length > 0 ? baseTotal / members.length : 0;
        members.forEach((m) => {
          if (balancesMap[m.user_id]) {
            balancesMap[m.user_id].totalOwed += splitAmount;
          }
        });
      }
    });

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
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-primary">Trip not found or access denied</h2>
        <Link href="/" className="text-xs text-accent hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary mb-2 transition"
          >
            <ArrowLeft size={14} />
            <span>All Trips</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-primary">{trip.name}</h1>
            <Badge variant="accent">{trip.base_currency}</Badge>
          </div>
          {trip.destination && (
            <p className="text-xs text-secondary mt-1 flex items-center gap-1">
              <Compass size={13} className="text-accent" />
              <span>{trip.destination}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            icon={<Share2 size={14} className="text-accent" />}
          >
            <span>Invite Code ({trip.invite_code})</span>
          </Button>

          <Button
            variant="tinted"
            size="sm"
            onClick={() => handleOpenSettle()}
            icon={<CheckCircle2 size={14} />}
          >
            <span>Settle Up</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddExpenseOpen(true)}
            icon={<Plus size={15} />}
          >
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-subtle border border-subtle w-fit text-xs font-semibold">
        <button
          onClick={() => setActiveTab("balances")}
          className={`px-3.5 py-1.5 rounded-xl transition-all duration-150 flex items-center gap-2 ${
            activeTab === "balances"
              ? "bg-surface text-primary shadow-apple-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          <TrendingUp size={14} className={activeTab === "balances" ? "text-accent" : ""} />
          <span>Balances & Debts</span>
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`px-3.5 py-1.5 rounded-xl transition-all duration-150 flex items-center gap-2 ${
            activeTab === "expenses"
              ? "bg-surface text-primary shadow-apple-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          <Receipt size={14} className={activeTab === "expenses" ? "text-accent" : ""} />
          <span>Expenses ({expenses.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`px-3.5 py-1.5 rounded-xl transition-all duration-150 flex items-center gap-2 ${
            activeTab === "activity"
              ? "bg-surface text-primary shadow-apple-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          <Activity size={14} className={activeTab === "activity" ? "text-accent" : ""} />
          <span>Activity</span>
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`px-3.5 py-1.5 rounded-xl transition-all duration-150 flex items-center gap-2 ${
            activeTab === "members"
              ? "bg-surface text-primary shadow-apple-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          <Users size={14} className={activeTab === "members" ? "text-accent" : ""} />
          <span>Members ({members.length})</span>
        </button>
      </div>

      {/* Tab 1: Balances & Simplified Debts */}
      {activeTab === "balances" && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-6">
              <span className="text-xs font-semibold text-secondary">Total Group Spent</span>
              <p className="text-2xl font-black text-primary mt-1">
                {trip.base_currency} {totalTripSpent.toFixed(2)}
              </p>
            </Card>
            <Card className="p-6">
              <span className="text-xs font-semibold text-secondary">Total Expenses Logged</span>
              <p className="text-2xl font-black text-primary mt-1">{expenses.length}</p>
            </Card>
            <Card className="p-6">
              <span className="text-xs font-semibold text-secondary">Simplified Debts Required</span>
              <p className="text-2xl font-black text-accent mt-1">{simplifiedDebts.length} Transfers</p>
            </Card>
          </div>

          {/* Simplified Debt Solver Recommendations */}
          <Card className="p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-primary">Smart Debt Simplification</h2>
                <p className="text-xs text-secondary">
                  Minimum bank transfers required to settle all debts in {trip.base_currency}
                </p>
              </div>
              <Badge variant="accent">Greedy Min-Cash-Flow</Badge>
            </div>

            {simplifiedDebts.length === 0 ? (
              <div className="p-6 text-center text-xs text-accent bg-accent-subtle border border-accent-border/40 rounded-2xl">
                ✨ All debts are completely settled! Everyone is even.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {simplifiedDebts.map((debt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-surface border border-subtle flex items-center justify-between shadow-apple-sm hover:border-strong transition-all duration-150"
                  >
                    <div className="text-xs">
                      <span className="font-bold text-primary">{getUserName(debt.from_user_id)}</span>
                      <span className="text-muted mx-1.5">owes</span>
                      <span className="font-bold text-accent">{getUserName(debt.to_user_id)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-black text-primary text-sm">
                        {debt.currency} {debt.amount.toFixed(2)}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenSettle(debt.from_user_id, debt.to_user_id, debt.amount)}
                      >
                        Settle
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Member Net Balances Table */}
          <Card className="p-7 space-y-4">
            <h2 className="text-base font-bold text-primary">Member Balances</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-subtle text-secondary">
                    <th className="pb-3 font-semibold">Member</th>
                    <th className="pb-3 font-semibold">Total Paid</th>
                    <th className="pb-3 font-semibold">Total Consumed</th>
                    <th className="pb-3 font-semibold text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {memberBalances.map((b) => {
                    const isPositive = b.net_balance > 0;
                    const isZero = Math.abs(b.net_balance) < 0.01;
                    return (
                      <tr key={b.user_id} className="text-secondary">
                        <td className="py-3.5 font-semibold text-primary">{getUserName(b.user_id)}</td>
                        <td className="py-3.5">
                          {trip.base_currency} {b.total_paid.toFixed(2)}
                        </td>
                        <td className="py-3.5">
                          {trip.base_currency} {b.total_owed.toFixed(2)}
                        </td>
                        <td
                          className={`py-3.5 text-right font-bold ${
                            isZero
                              ? "text-muted"
                              : isPositive
                              ? "text-accent"
                              : "text-rose-500"
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
          </Card>
        </div>
      )}

      {/* Tab 2: Expenses List */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-primary">Expense Ledger</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddExpenseOpen(true)}
              icon={<Plus size={14} />}
            >
              <span>Add Expense</span>
            </Button>
          </div>

          {expenses.length === 0 ? (
            <Card className="border-dashed p-12 text-center bg-surface/50">
              <p className="text-xs text-secondary mb-4">No expenses recorded yet for this trip.</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddExpenseOpen(true)}
                icon={<Plus size={14} />}
              >
                <span>Log First Expense</span>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <Card
                  key={exp.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-apple-sm"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-surface-subtle text-secondary border border-subtle">
                        {exp.category}
                      </span>
                      <h3 className="text-sm font-bold text-primary">{exp.title}</h3>
                    </div>
                    <p className="text-xs text-secondary">
                      Paid by <span className="text-accent font-semibold">{getUserName(exp.paid_by_user_id)}</span> &bull;{" "}
                      {new Date(exp.date).toLocaleDateString()}
                    </p>
                    {exp.expense_items?.length > 1 && (
                      <p className="text-[11px] text-muted mt-1">
                        {exp.expense_items.length} itemized items
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-primary">
                      {exp.currency} {exp.amount.toFixed(2)}
                    </div>
                    {exp.currency !== trip.base_currency && (
                      <p className="text-[11px] text-muted">
                        &asymp; {trip.base_currency} {exp.base_currency_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Realtime Activity Feed */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-primary">Live Activity Feed</h2>
            <span className="flex items-center gap-1.5 text-[11px] text-accent font-semibold">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Live Realtime Active
            </span>
          </div>

          {activities.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted">
              No recent activity recorded yet.
            </Card>
          ) : (
            <div className="space-y-2.5">
              {activities.map((act) => (
                <Card
                  key={act.activity_id}
                  className="p-3.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-surface-subtle text-accent border border-subtle">
                      {act.activity_type === "expense_added" ? (
                        <Receipt size={15} />
                      ) : act.activity_type === "settled" ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Users size={15} />
                      )}
                    </div>
                    <div>
                      <p className="text-primary font-semibold">{act.description}</p>
                      <p className="text-[10px] text-muted">
                        {new Date(act.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {act.amount > 0 && (
                    <span className="font-bold text-primary">
                      {act.currency} {act.amount.toFixed(2)}
                    </span>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Members */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-primary">Trip Roster ({members.length})</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsInviteOpen(true)}
              icon={<Share2 size={14} />}
            >
              <span>Invite Friends</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {members.map((m) => (
              <Card
                key={m.id}
                className="p-4 flex items-center justify-between shadow-apple-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent text-white flex items-center justify-center font-bold text-sm shadow-accent">
                    {m.user?.name?.[0]?.toUpperCase() || m.user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary text-xs">{m.user?.name || "Anonymous"}</span>
                      {m.role === "owner" && (
                        <Badge variant="accent" className="text-[9px] py-0 px-1.5">
                          Owner
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted">{m.user?.email}</p>
                  </div>
                </div>

                <div className="text-right text-[10px] text-muted">
                  Joined {new Date(m.joined_at).toLocaleDateString()}
                </div>
              </Card>
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
