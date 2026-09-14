"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { X, Smartphone, Check, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ConnectMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectMobileModal({ isOpen, onClose }: ConnectMobileModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [connectUrl, setConnectUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    async function generateCode() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const session = data.session;

        const serverUrl = window.location.origin;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        const accessToken = session?.access_token || "";
        const refreshToken = session?.refresh_token || "";

        // Format: evenly://connect?server=...&supabase=...&anon=...&access=...&refresh=...
        const payload = {
          server: serverUrl,
          supabaseUrl,
          anonKey,
          accessToken,
          refreshToken,
        };

        const encoded = encodeURIComponent(JSON.stringify(payload));
        const deepLink = `evenly://connect?data=${encoded}`;
        setConnectUrl(deepLink);

        const url = await QRCode.toDataURL(deepLink, {
          width: 280,
          margin: 2,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });

        setQrDataUrl(url);
      } catch (err) {
        console.error("Failed to generate QR code", err);
      } finally {
        setLoading(false);
      }
    }

    generateCode();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(connectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Smartphone size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Connect Mobile App</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Instant pairing with iOS & Android</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-4">
          {loading ? (
            <div className="w-56 h-56 flex items-center justify-center text-sm text-slate-400">
              Generating secure pairing code...
            </div>
          ) : qrDataUrl ? (
            <img src={qrDataUrl} alt="Connect Mobile QR Code" className="w-56 h-56 rounded-lg shadow-sm" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-sm text-red-500">
              Could not generate code
            </div>
          )}
        </div>

        <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-5 list-decimal list-inside">
          <li>Open the <strong>Evenly</strong> app on your smartphone.</li>
          <li>Tap <strong>Scan QR to Pair</strong> on the welcome screen.</li>
          <li>Hold your camera over this QR code to sign in automatically!</li>
        </ol>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? "Copied Deep Link" : "Copy Direct Link"}
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
