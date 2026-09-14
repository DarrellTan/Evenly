"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

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
      <Card className="p-8 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent text-white text-2xl mb-3 shadow-accent">
            🌍
          </div>
          <h1 className="text-2xl font-black tracking-tight text-primary">
            {isMagicLink ? "Magic Link Sign In" : isSignUp ? "Create your Account" : "Welcome Back"}
          </h1>
          <p className="text-xs text-secondary mt-1.5">
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
                ? "bg-accent-subtle border-accent-border/60 text-accent"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400"
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
            <Input
              label="Display Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Tan"
            />
          )}

          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@example.com"
            icon={<Mail size={16} />}
          />

          {!isMagicLink && (
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock size={16} />}
            />
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            size="lg"
            className="w-full mt-2"
            icon={<ArrowRight size={16} />}
          >
            {loading ? "Authenticating..." : isMagicLink ? "Send Magic Link" : isSignUp ? "Create Free Account" : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-subtle flex flex-col gap-2.5 text-center text-xs text-secondary">
          <button
            type="button"
            onClick={() => {
              setIsMagicLink(!isMagicLink);
              setMessage(null);
            }}
            className="inline-flex items-center justify-center gap-1.5 text-accent hover:opacity-80 transition font-medium"
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
                className="text-accent hover:underline font-semibold ml-1"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
