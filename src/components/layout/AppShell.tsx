"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import NetworkBadge from "./NetworkBadge";
import EthicsFooter from "@/components/compliance/EthicsFooter";
import FirstRunModal from "@/components/FirstRunModal";
import { useLicenseStore } from "@/lib/license-store";

const NAV = [
  { href: "/",         label: "Library" },
  { href: "/settings", label: "Settings" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { license } = useLicenseStore();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/" || pathname.startsWith("/matter/");
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {license.kind === "expired" && <ExpiredBanner />}

      {/* Chrome bar */}
      <header
        className="sticky top-0 z-50 border-b border-rule"
        style={{ background: "rgba(246,244,239,0.85)", backdropFilter: "saturate(140%) blur(10px)" }}
      >
        <div className="max-w-[1280px] mx-auto px-7 py-3 flex items-center gap-6">
          {/* Brand mark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-medium text-[15px] tracking-[-0.012em] text-ink"
          >
            <span className="grid place-items-center w-[22px] h-[22px] rounded-[4px] bg-navy text-white font-serif italic font-medium text-sm leading-none select-none">
              D
            </span>
            <span>Docket LM</span>
          </Link>

          {/* Primary nav */}
          <nav className="hidden sm:flex gap-0.5 ml-7">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-active={isActive(item.href)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm text-ink-2 font-[450]",
                  "hover:text-ink hover:bg-[rgba(20,18,12,0.04)]",
                  "data-[active=true]:text-ink data-[active=true]:bg-[rgba(20,18,12,0.06)]",
                  "transition-colors duration-[120ms]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2.5">
            <LicensePill />
            <NetworkBadge />
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="sm:hidden flex items-center justify-around border-t border-rule text-xs">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 py-2 text-center text-ink-3",
                isActive(item.href) && "text-ink font-medium",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Page content — padded-bottom so content clears the fixed footer */}
      <main className="flex-1 pb-[52px]">{children}</main>

      <EthicsFooter />
      <FirstRunModal />
    </div>
  );
}

function LicensePill() {
  const { license } = useLicenseStore();

  if (license.kind === "active" || license.kind === "expired") return null;

  if (license.kind === "trial") {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-soft border border-[var(--amber-soft)] text-[13px] text-amber font-[450]">
        Trial · {license.daysLeft} days left
        <Link href="/settings" className="underline underline-offset-2 hover:no-underline ml-0.5">
          Renew
        </Link>
      </span>
    );
  }

  // renewal
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-3 border border-rule text-[13px] text-ink-2 font-[450]">
      Renewal due in {license.daysLeft} days
      <Link href="/settings" className="underline underline-offset-2 hover:no-underline ml-0.5">
        Renew
      </Link>
    </span>
  );
}

function ExpiredBanner() {
  return (
    <div className="bg-brick-soft border-b border-rule-strong px-7 py-2.5 text-sm text-ink flex items-center justify-center gap-3.5">
      <strong className="text-brick">License expired.</strong>
      <span className="text-ink-2">
        Existing matters are read-only. Renew at docketlm.app to resume new matter work.
      </span>
      <Link href="/settings" className="ml-1.5 px-2.5 py-1 rounded border border-rule-strong bg-surface text-sm text-ink hover:bg-surface-2 transition-colors duration-[120ms]">
        Renew
      </Link>
    </div>
  );
}
