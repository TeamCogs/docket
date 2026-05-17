"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import NetworkBadge from "./NetworkBadge";
import EthicsFooter from "@/components/compliance/EthicsFooter";

const NAV = [
  { href: "/", label: "Library" },
  { href: "/eval", label: "Eval Lab" },
  { href: "/settings", label: "Settings" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo />
            <span className="font-sans font-semibold tracking-tight text-ink-900 group-hover:text-navy-600">
              Docket LM
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition-colors",
                  pathname === n.href && "text-ink-900 bg-ink-100",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <NetworkBadge />
        </div>
        {/* Mobile nav. Bottom tab bar is more thumb-friendly than a hamburger. */}
        <nav className="sm:hidden flex items-center justify-around border-t border-ink-100 text-xs">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex-1 py-2 text-center text-ink-500",
                pathname === n.href && "text-ink-900 font-medium",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <EthicsFooter />
    </div>
  );
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <rect x="2" y="3" width="13" height="14" rx="1.5" fill="#1f2c47" />
      <rect x="5" y="6" width="13" height="14" rx="1.5" fill="#384e7d" opacity="0.55" />
      <line x1="8" y1="9" x2="14" y2="9" stroke="white" strokeWidth="1" />
      <line x1="8" y1="12" x2="14" y2="12" stroke="white" strokeWidth="1" />
      <line x1="8" y1="15" x2="11" y2="15" stroke="white" strokeWidth="1" />
    </svg>
  );
}
