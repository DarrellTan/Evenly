"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Compass, Calendar, DollarSign, MapPin, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SUPPORTED_CURRENCIES } from "@evenly/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

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
      <Card className="p-8">
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-subtle text-accent border border-accent-border/40 flex items-center justify-center shadow-apple-sm">
            <Compass size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">Create New Trip</h1>
            <p className="text-xs text-secondary">Setup your travel group and start tracking shared expenses</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Trip Name *"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tokyo Autumn 2026"
          />

          <Input
            label="Destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Tokyo, Japan"
            icon={<MapPin size={16} />}
          />

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">
              Base Currency *
            </label>
            <div className="relative">
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-subtle text-sm text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-150 appearance-none"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} ({curr.symbol}) — {curr.name}
                  </option>
                ))}
              </select>
              <DollarSign size={16} className="absolute left-3.5 top-3 text-muted pointer-events-none" />
            </div>
            <p className="text-[11px] text-muted mt-1">
              All trip expenses will be converted to this currency for settlement balance calculations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              icon={<Calendar size={14} />}
            />

            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              icon={<Calendar size={14} />}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            size="lg"
            className="w-full mt-4"
            icon={<ArrowRight size={16} />}
          >
            {loading ? "Creating Trip..." : "Launch Trip Group"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
