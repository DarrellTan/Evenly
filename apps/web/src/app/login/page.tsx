"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Check your email inbox for your instant sign-in link!",
        });
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split("@")[0],
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Account created! You can now log in.",
        });
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Authentication failed. Please check your credentials.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-2xl mb-3 shadow-lg shadow-indigo-500/30">
            🌍
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            {isMagicLink ? "Magic Link Sign In" : isSignUp ? "Create your Account" : "Welcome Back"}
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            {isMagicLink
              ? "We will send an instant login link to your inbox"
              : isSignUp
              ? "Start splitting travel expenses freely with friends"
              : "Sign in to manage trips and settle up"}
          </p>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 mb-6 border ${
              message.type === "success"
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                : "bg-red-950/40 border-red-800/60 text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && !isMagicLink && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Tan"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
              <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
            </div>
          </div>

          {!isMagicLink && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
                />
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{isMagicLink ? "Send Magic Link" : isSignUp ? "Create Free Account" : "Sign In"}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col gap-2.5 text-center text-xs text-slate-400">
          <button
            type="button"
            onClick={() => {
              setIsMagicLink(!isMagicLink);
              setMessage(null);
            }}
            className="inline-flex items-center justify-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition font-medium"
          >
            <Sparkles size={13} />
            <span>{isMagicLink ? "Sign in with password instead" : "Use Passwordless Magic Link"}</span>
          </button>

          {!isMagicLink && (
            <div>
              {isSignUp ? "Already have an account? " : "Don't have an account yet? "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setMessage(null);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 ml-1"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
