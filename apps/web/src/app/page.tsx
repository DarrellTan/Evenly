"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Plus, ArrowRight, ShieldCheck, Zap, Globe, Receipt, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConnectMobileModal } from "@/components/ConnectMobileModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  // Logged-in Dashboard
  if (user) {
    return (
      <div className="py-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
              Welcome back, {user.user_metadata?.name || user.email?.split("@")[0]}!
            </h1>
            <p className="text-xs sm:text-sm text-secondary mt-1">
              Manage your travel groups, track expenses, and settle balances.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<Smartphone size={14} className="text-accent" />}
              onClick={() => setShowConnectModal(true)}
            >
              <span>Pair Mobile</span>
            </Button>
            <Link href="/trips/new">
              <Button variant="primary" size="sm" icon={<Plus size={14} />}>
                <span>New Trip</span>
              </Button>
            </Link>
          </div>
        </div>

        {trips.length === 0 ? (
          <Card className="border-dashed p-12 text-center bg-surface/50">
            <div className="w-16 h-16 rounded-3xl bg-accent-subtle text-accent mx-auto flex items-center justify-center mb-4 shadow-apple-sm">
              <Compass size={32} />
            </div>
            <h2 className="text-lg font-bold text-primary mb-1">No trips yet</h2>
            <p className="text-xs text-secondary max-w-sm mx-auto mb-6">
              Create your first travel group to track shared dinners, accommodations, and foreign currency bills with friends.
            </p>
            <Link href="/trips/new">
              <Button variant="primary" size="md" icon={<Plus size={15} />}>
                <span>Create Travel Group</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trips.map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}`}>
                <Card hoverable className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="accent">{trip.base_currency}</Badge>
                      <span className="text-[11px] text-muted">
                        {trip.trip_members?.length || 1} member{trip.trip_members?.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-primary hover:text-accent transition-colors duration-150 mb-1">
                      {trip.name}
                    </h3>
                    {trip.destination && (
                      <p className="text-xs text-secondary">{trip.destination}</p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-subtle flex items-center justify-between text-xs text-secondary">
                    <span>Open Dashboard</span>
                    <ArrowRight size={14} className="text-accent" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <ConnectMobileModal isOpen={showConnectModal} onClose={() => setShowConnectModal(false)} />
      </div>
    );
  }

  // Logged-out Landing Hero (Apple Minimal Aesthetic)
  return (
    <div className="py-12 sm:py-20 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-6">

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-primary leading-tight">
          Split travel expenses with friends.{" "}
          <span className="text-accent underline decoration-accent/30 decoration-wavy underline-offset-8">
            Zero paywalls.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-secondary max-w-2xl mx-auto leading-relaxed">
          No daily expense limits, no forced subscriptions, and zero ads. Engineered specifically for travel groups with multi-currency conversion, itemized receipt breakdown, and smart debt simplification.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" variant="primary" icon={<ArrowRight size={16} />}>
              <span>Start Free Trip</span>
            </Button>
          </Link>
          <a
            href="https://github.com/DarrellTan/Evenly"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            <Button size="lg" variant="secondary" icon={<Globe size={16} />}>
              <span>GitHub (MIT)</span>
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-7 space-y-3.5">
          <div className="w-11 h-11 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shadow-apple-sm">
            <Receipt size={22} />
          </div>
          <h2 className="text-base font-bold text-primary">Itemized Receipt Breakdown</h2>
          <p className="text-xs text-secondary leading-relaxed">
            Split restaurant checks item by item. Assign who ordered which dish, share drinks 50/50, and calculate local taxes and service fees proportionally.
          </p>
        </Card>

        <Card className="p-7 space-y-3.5">
          <div className="w-11 h-11 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shadow-apple-sm">
            <Globe size={22} />
          </div>
          <h2 className="text-base font-bold text-primary">Multi-Currency & Roaming</h2>
          <p className="text-xs text-secondary leading-relaxed">
            Spend in Japanese Yen, Euro, or British Pounds. Evenly automatically converts to your trip’s base currency using cached exchange rates even without data.
          </p>
        </Card>

        <Card className="p-7 space-y-3.5">
          <div className="w-11 h-11 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center shadow-apple-sm">
            <ShieldCheck size={22} />
          </div>
          <h2 className="text-base font-bold text-primary">Minimum-Transfer Settlements</h2>
          <p className="text-xs text-secondary leading-relaxed">
            Smart debt simplification collapses 15 circular debts into 3 direct bank transfers. Settle up via Wise, Revolut, Venmo, or local bank handles.
          </p>
        </Card>
      </div>
    </div>
  );
}
