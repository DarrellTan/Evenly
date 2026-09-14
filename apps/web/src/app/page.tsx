"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Plus, ArrowRight, ShieldCheck, Zap, Globe, Receipt, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConnectMobileModal } from "@/components/ConnectMobileModal";

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        setUser(userData.user);

        if (userData.user) {
          const { data: tripData } = await supabase
            .from("trips")
            .select(`
              id,
              name,
              destination,
              base_currency,
              start_date,
              end_date,
              created_at,
              trip_members (
                id,
                user_id,
                role
              )
            `)
            .order("created_at", { ascending: false });

          setTrips(tripData || []);
        }
      } catch (err) {
        console.error("Error loading trips:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Logged-in Dashboard
  if (user) {
    return (
      <div className="py-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user.user_metadata?.name || user.email?.split("@")[0]}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage your travel groups, track expenses, and settle balances.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConnectModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
            >
              <Smartphone size={15} className="text-indigo-400" />
              <span>Pair Mobile</span>
            </button>
            <Link
              href="/trips/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30"
            >
              <Plus size={15} />
              <span>New Trip</span>
            </Link>
          </div>
        </div>

        {trips.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/40">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 text-indigo-400 mx-auto flex items-center justify-center mb-4">
              <Compass size={32} />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">No trips yet</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Create your first travel group to track shared dinners, accommodations, and foreign currency bills with friends.
            </p>
            <Link
              href="/trips/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/25"
            >
              <Plus size={15} />
              <span>Create Travel Group</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="group relative rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-indigo-500/50 p-6 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
                      {trip.base_currency}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {trip.trip_members?.length || 1} member{trip.trip_members?.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition mb-1">
                    {trip.name}
                  </h3>
                  {trip.destination && (
                    <p className="text-xs text-slate-400">{trip.destination}</p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span>Open Trip Dashboard</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 text-indigo-400 transition" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <ConnectMobileModal isOpen={showConnectModal} onClose={() => setShowConnectModal(false)} />
      </div>
    );
  }

  // Logged-out Landing Hero
  return (
    <div className="py-12 sm:py-20 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-400 border border-indigo-800/50">
          <Zap size={14} />
          <span>The Free, Self-Hostable Splitwise Alternative</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Split travel expenses with friends.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">
            Zero paywalls.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
          No daily expense limits, no paid subscriptions, and no full-screen ads. Designed specifically for travel groups with multi-currency conversion, itemized restaurant breakdowns, and smart debt simplification.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
          >
            <span>Start Free Trip</span>
            <ArrowRight size={16} />
          </Link>
          <a
            href="https://github.com/DarrellTan/Evenly"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
          >
            <Globe size={16} />
            <span>GitHub (MIT)</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Receipt size={20} />
          </div>
          <h2 className="text-base font-bold text-white">Itemized Receipt Breakdowns</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Split restaurant checks dish-by-dish. Assign who ate what, share drinks 50/50, and calculate taxes and service charges automatically.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Globe size={20} />
          </div>
          <h2 className="text-base font-bold text-white">Multi-Currency & Roaming</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Spend in Japanese Yen, Euro, or British Pounds. Evenly converts to your trip’s base currency using live or cached exchange rates even without data.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <h2 className="text-base font-bold text-white">Minimum-Transfer Settlements</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Smart debt simplification collapses 15 circular debts into 3 direct bank transfers. Clear debts via Wise, Revolut, Venmo, or local bank handles.
          </p>
        </div>
      </div>
    </div>
  );
}
