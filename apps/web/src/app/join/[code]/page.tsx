"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function JoinTripPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkTripAndUser() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        setUser(userData.user);

        const { data: tripData, error: tripErr } = await supabase
          .from("trips")
          .select("id, name, destination, base_currency, owner_id")
          .eq("invite_code", code)
          .single();

        if (tripErr) {
          setError("Invalid invite code or trip no longer exists.");
        } else {
          setTrip(tripData);

          if (userData.user) {
            const { data: member } = await supabase
              .from("trip_members")
              .select("id")
              .eq("trip_id", tripData.id)
              .eq("user_id", userData.user.id)
              .maybeSingle();

            if (member) {
              router.push(`/trips/${tripData.id}`);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load trip information");
      } finally {
        setLoading(false);
      }
    }

    checkTripAndUser();
  }, [code, supabase, router]);

  const handleJoin = async () => {
    if (!user) {
      router.push(`/login?next=/join/${code}`);
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const { error: joinErr } = await supabase.from("trip_members").insert({
        trip_id: trip.id,
        user_id: user.id,
        role: "member",
      });

      if (joinErr) throw joinErr;

      router.push(`/trips/${trip.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to join trip");
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-900/60 mx-auto flex items-center justify-center font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-primary">Trip Not Found</h2>
        <p className="text-xs text-secondary">{error || "Please check the invite code and try again."}</p>
        <Link href="/" className="inline-block text-xs text-accent hover:underline">
          Return to Evenly Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card className="p-8 text-center">
        <div className="w-16 h-16 rounded-3xl bg-accent-subtle text-accent border border-accent-border/40 mx-auto flex items-center justify-center mb-5 shadow-apple-sm">
          <Compass size={32} />
        </div>

        <Badge variant="accent" className="mb-2">
          You are invited to join
        </Badge>
        <h1 className="text-2xl font-black text-primary mt-1 mb-1">{trip.name}</h1>
        {trip.destination && (
          <p className="text-xs text-secondary mb-6">{trip.destination}</p>
        )}

        <div className="p-4 rounded-2xl bg-surface-subtle border border-subtle text-xs text-secondary mb-6 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted">Base Currency</span>
            <span className="font-bold text-primary">{trip.base_currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Invite Code</span>
            <span className="font-mono text-accent font-bold">{code}</span>
          </div>
        </div>

        <Button
          onClick={handleJoin}
          disabled={joining}
          variant="primary"
          size="lg"
          className="w-full"
          icon={<ArrowRight size={16} />}
        >
          {joining ? "Joining Trip..." : user ? "Join Trip" : "Sign In to Join Trip"}
        </Button>
      </Card>
    </div>
  );
}
