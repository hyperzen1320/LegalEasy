"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = {
  name: string;
  href: string;
  icon: () => React.ReactElement;
  comingSoon?: boolean;
};

const NAV: NavItem[] = [
  { name: "Dashboard", href: "/app", icon: IconDashboard },
  { name: "Case Vault", href: "/app/cases", icon: IconCases },
  { name: "Client Crew", href: "/app/clients", icon: IconClients },
  { name: "Hearing Track", href: "/app/hearings", icon: IconHearings },
  { name: "Court Hub", href: "/app/courts", icon: IconCourts },
  { name: "Work Flow", href: "/app/workflow", icon: IconBoards },
  { name: "AI Assistant", href: "/app/ai", icon: IconAI },
  { name: "My Profile", href: "/app/profile", icon: IconProfile },
  { name: "Users / Advocates", href: "/app/users", icon: IconUsers },
];

export default function Sidebar({
  partnerName,
  user,
}: {
  partnerName: string;
  user: { firstName: string; lastName: string; email: string };
}) {
  const pathname = usePathname();

  return (
    <aside
      className="sticky top-0 flex h-screen w-[260px] flex-col border-r"
      style={{
        backgroundColor: "var(--color-app-ink)",
        borderColor: "var(--color-app-ink-3)",
      }}
    >
      {/* Brand */}
      <Link
        href="/app"
        className="flex items-center gap-3 px-5 pb-5 pt-7 transition-opacity hover:opacity-90"
      >
        <BrandMark />
        <div className="leading-none min-w-0">
          <div
            className="truncate text-[16px] font-semibold tracking-tight"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-ivory)",
            }}
          >
            {partnerName}
          </div>
          <div
            className="mt-1 text-[10px] uppercase tracking-[0.2em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-copper-bright)",
            }}
          >
            Advocate · Office
          </div>
        </div>
      </Link>

      <div
        className="mx-5 mb-3 h-px"
        style={{ backgroundColor: "var(--color-app-ink-3)" }}
      />

      {/* Section label */}
      <div
        className="px-5 pb-2 text-[9px] uppercase tracking-[0.22em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-ivory-dim)",
        }}
      >
        Workspace
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        {NAV.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className="group relative mb-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-all"
              style={{
                backgroundColor: isActive
                  ? "var(--color-app-ink-2)"
                  : "transparent",
                color: isActive
                  ? "var(--color-app-copper-bright)"
                  : "var(--color-app-ivory-soft)",
                fontFamily: "var(--font-manrope), sans-serif",
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm"
                  style={{ backgroundColor: "var(--color-app-copper)" }}
                />
              )}
              <Icon />
              <span className="flex-1">{item.name}</span>
              {item.comingSoon && (
                <span
                  className="rounded-sm border px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.16em]"
                  style={{
                    fontFamily: "var(--font-dm-mono), monospace",
                    borderColor: "var(--color-app-ink-3)",
                    color: "var(--color-app-ivory-dim)",
                  }}
                >
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div
        className="border-t p-4"
        style={{ borderColor: "var(--color-app-ink-3)" }}
      >
        <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold uppercase"
            style={{
              backgroundColor: "var(--color-app-copper)",
              color: "var(--color-app-copper-text)",
              fontFamily: "var(--font-manrope), sans-serif",
            }}
          >
            {(user.firstName[0] || "?").toUpperCase()}
            {(user.lastName[0] || "").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-[12px] font-medium"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-ivory)",
              }}
            >
              {user.firstName} {user.lastName}
            </div>
            <div
              className="truncate text-[10px]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                color: "var(--color-app-ivory-dim)",
              }}
            >
              {user.email}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
            style={{ color: "var(--color-app-ivory-soft)" }}
            title="Sign out"
            aria-label="Sign out"
          >
            <IconSignOut />
          </button>
        </div>

        <div
          className="mt-3 text-center text-[9px] uppercase tracking-[0.22em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-ivory-dim)",
          }}
        >
          v1.0 · Phase 1 MVP
        </div>
      </div>
    </aside>
  );
}

function BrandMark() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      aria-hidden
      className="shrink-0"
    >
      {/* warm copper background */}
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="6"
        fill="#c5853a"
        stroke="#8a5821"
        strokeWidth="0.5"
      />
      {/* scales of justice glyph */}
      <g
        stroke="#0a1124"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <line x1="20" y1="9" x2="20" y2="30" />
        <line x1="13" y1="30" x2="27" y2="30" />
        <line x1="11" y1="14" x2="29" y2="14" />
        <path d="M15 14 L11 22 a2 2 0 0 0 4 0 L11 14" fill="#0a1124" fillOpacity="0.15" />
        <path d="M25 14 L29 22 a2 2 0 0 1 -4 0 L29 14" fill="#0a1124" fillOpacity="0.15" />
      </g>
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="9" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="3" width="7" height="5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="16" width="7" height="5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="12" width="7" height="9" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconCases() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12h18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconClients() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17.5" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14 19c0-2 2-3.5 4-3.5s3.5 1.5 3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconHearings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15" r="0.8" fill="currentColor" />
    </svg>
  );
}
function IconCourts() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 9l9-5 9 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5 9v10M19 9v10M3 21h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 11v6M12 11v6M16 11v6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconBoards() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="7" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="4" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="16" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconAI() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSignOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
