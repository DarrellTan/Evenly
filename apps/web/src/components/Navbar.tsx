"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Smartphone, Plus, LogIn, LogOut, Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConnectMobileModal } from "./ConnectMobileModal";

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
                🌍
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">Evenly</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500 dark:text-indigo-400 -mt-1">Travel Splits</span>
              </div>
            </Link>

            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
              Free & Self-Hostable
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 transition shadow-sm"
              title="Connect Mobile App"
            >
              <Smartphone size={14} className="text-indigo-500" />
              <span className="hidden sm:inline">Connect Mobile</span>
            </button>

            {user ? (
              <>
                <Link
                  href="/trips/new"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm shadow-indigo-500/25"
                >
                  <Plus size={15} />
                  <span>New Trip</span>
                </Link>

                <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                <button
                  onClick={handleSignOut}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm shadow-indigo-500/25"
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <ConnectMobileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
