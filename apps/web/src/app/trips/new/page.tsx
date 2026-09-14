"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Compass, Calendar, DollarSign, MapPin, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SUPPORTED_CURRENCIES } from "@evenly/shared";

export default function NewTripPage() {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      }
    });
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .insert({
          name,
          destination: destination || null,
          base_currency: baseCurrency,
          start_date: startDate || null,
          end_date: endDate || null,
          owner_id: userData.user.id,
        })
        .select()
        .single();

      if (tripErr) throw tripErr;

      router.push(`/trips/${trip.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Compass size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Create New Trip</h1>
            <p className="text-xs text-slate-400">Setup your travel group and start tracking shared expenses</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Trip Name <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tokyo Autumn 2026"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Destination</label>
            <div className="relative">
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Japan"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
              <MapPin size={16} className="absolute left-3.5 top-3 text-slate-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Base Currency <span className="text-indigo-400">*</span>
            </label>
            <div className="relative">
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition appearance-none"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} ({curr.symbol}) — {curr.name}
                  </option>
                ))}
              </select>
              <DollarSign size={16} className="absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">All trip expenses will be converted to this currency for settlement balance calculations.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Start Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
                <Calendar size={14} className="absolute left-3.5 top-2.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">End Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
                <Calendar size={14} className="absolute left-3.5 top-2.5 text-slate-500" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {loading ? (
              <span>Creating Trip...</span>
            ) : (
              <>
                <span>Launch Trip Group</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
