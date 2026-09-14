"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogIn, LogOut, Smartphone, ChevronDown, User, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConnectMobileModal } from "./ConnectMobileModal";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { Button } from "./ui/Button";

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (data.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("name, avatar_url")
          .eq("id", data.user.id)
          .maybeSingle();

        setProfile(prof);
      }
    }

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const displayName =
    profile?.name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Account";

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <>
      <header className="sticky top-0 z-40 w-full apple-glass border-b border-subtle">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Brand Logo (Clean, no subtext) */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center text-base shadow-sm group-hover:scale-105 transition-transform duration-150">
              🌍
            </div>
            <span className="font-extrabold text-lg tracking-tight text-primary">Evenly</span>
          </Link>

          {/* Right Section (Minimalist: Bell & Profile) */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {user ? (
              <>
                {/* Notification Bell (w-9 h-9) */}
                <NotificationBell userId={user.id} />

                {/* User Profile Circular Button (w-9 h-9) */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="relative w-9 h-9 rounded-full bg-surface-subtle hover:bg-surface border border-subtle flex items-center justify-center text-primary transition-all duration-150 active:scale-95 shadow-apple-sm"
                    aria-label="User Account Menu"
                    aria-expanded={isDropdownOpen}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-primary">
                        {displayName[0]?.toUpperCase() || <User size={14} />}
                      </span>
                    )}

                    {/* Subtle bottom-right chevron badge */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-surface border border-subtle flex items-center justify-center text-muted shadow-apple-sm">
                      <ChevronDown size={9} />
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-neutral-700 shadow-2xl p-2 z-50 text-xs animate-fade-in text-primary">
                      {/* User Header */}
                      <div className="px-3 py-2.5 border-b border-subtle mb-1.5">
                        <p className="font-bold text-primary truncate text-sm">{displayName}</p>
                        <p className="text-[11px] text-muted truncate">{user.email}</p>
                      </div>

                      {/* Appearance / Theme Toggle */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-subtle border border-subtle mb-1.5">
                        <span className="text-secondary font-semibold flex items-center gap-2">
                          <Palette size={14} className="text-accent" />
                          <span>Theme</span>
                        </span>
                        <ThemeToggle />
                      </div>

                      {/* New Trip Action in Dropdown */}
                      <Link
                        href="/trips/new"
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-subtle transition font-medium"
                      >
                        <Plus size={15} className="text-accent" />
                        <span>Create New Trip</span>
                      </Link>

                      {/* Mobile App Connect */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-subtle transition font-medium"
                      >
                        <Smartphone size={15} className="text-accent" />
                        <span>Connect Mobile App</span>
                      </button>

                      <div className="h-px bg-subtle my-1" />

                      {/* Sign Out */}
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition font-medium"
                      >
                        <LogOut size={15} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Link href="/login">
                  <Button size="sm" variant="primary" icon={<LogIn size={14} />}>
                    <span>Sign In</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <ConnectMobileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
