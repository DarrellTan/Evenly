import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Evenly — Free Travel Expense Splitting",
  description: "Free, open-source, self-hostable travel expense splitting for friend groups. No paywalls, subscription fees, or limits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
          Evenly — Open-Source Travel Expense Splitting &bull; MIT License
        </footer>
      </body>
    </html>
  );
}
