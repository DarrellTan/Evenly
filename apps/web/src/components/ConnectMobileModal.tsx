"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { X, Smartphone, Check, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui/Button";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-elevated border border-subtle p-7 shadow-apple-xl text-primary">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted hover:text-primary p-1.5 rounded-full hover:bg-surface-subtle transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-2xl bg-accent-subtle text-accent border border-accent-border/40 shadow-apple-sm">
            <Smartphone size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">Connect Mobile App</h3>
            <p className="text-xs text-secondary">Instant pairing with iOS & Android</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-5 bg-white rounded-2xl border border-subtle mb-5 shadow-apple-sm">
          {loading ? (
            <div className="w-56 h-56 flex items-center justify-center text-xs text-muted">
              Generating secure pairing code...
            </div>
          ) : qrDataUrl ? (
            <img src={qrDataUrl} alt="Connect Mobile QR Code" className="w-56 h-56 rounded-lg" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-xs text-rose-500">
              Could not generate code
            </div>
          )}
        </div>

        <ol className="text-xs text-secondary space-y-2 mb-6 list-decimal list-inside">
          <li>Open the <strong>Evenly</strong> app on your phone.</li>
          <li>Tap <strong>Scan QR to Pair</strong> on the welcome screen.</li>
          <li>Hold your camera over this code to sign in automatically!</li>
        </ol>

        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="flex-1"
            icon={copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
          >
            <span>{copied ? "Copied Deep Link" : "Copy Direct Link"}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
            className="px-6"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
