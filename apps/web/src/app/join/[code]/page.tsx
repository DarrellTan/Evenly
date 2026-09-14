"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Compass, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

          // If logged in, check if already member
          if (userData.user) {
            const { data: member } = await supabase
              .from("trip_members")
              .select("id")
              .eq("trip_id", tripData.id)
              .eq("user_id", userData.user.id)
              .maybeSingle();

            if (member) {
              // Already a member, redirect to trip
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
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-950/40 text-red-400 border border-red-800/60 mx-auto flex items-center justify-center">
          !
        </div>
        <h2 className="text-xl font-bold text-white">Trip Not Found</h2>
        <p className="text-xs text-slate-400">{error || "Please check the invite code and try again."}</p>
        <Link href="/" className="inline-block text-xs text-indigo-400 hover:underline">
          Return to Evenly Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mx-auto flex items-center justify-center mb-5">
          <Compass size={32} />
        </div>

        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
          You are invited to join
        </span>
        <h1 className="text-2xl font-black text-white mt-1 mb-2">{trip.name}</h1>
        {trip.destination && (
          <p className="text-xs text-slate-400 mb-6">{trip.destination}</p>
        )}

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 mb-6 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Base Currency</span>
            <span className="font-bold text-white">{trip.base_currency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Invite Code</span>
            <span className="font-mono text-indigo-400 font-bold">{code}</span>
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {joining ? (
            <span>Joining Trip...</span>
          ) : user ? (
            <>
              <span>Join Trip</span>
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              <span>Sign In to Join Trip</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
