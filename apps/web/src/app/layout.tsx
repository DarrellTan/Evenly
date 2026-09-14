import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('evenly_theme');
                if (saved === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-canvas text-primary flex flex-col selection:bg-emerald-500/20 selection:text-emerald-800 dark:selection:text-emerald-300">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="border-t border-subtle py-8 text-center text-xs text-muted">
            <p>Evenly — Free & Open-Source Travel Expense Splitting &bull; MIT License</p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
