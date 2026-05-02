"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/cases": "Case Vault",
  "/app/cases/new": "Add a case",
  "/app/clients": "Client Crew",
  "/app/hearings": "Hearing Track",
  "/app/courts": "Court Hub",
  "/app/workflow": "Work Flow",
  "/app/activity": "Activity",
  "/app/ai": "AI Assistant",
  "/app/profile": "My Profile",
  "/app/users": "Users / Advocates",
};

export default function Topbar() {
  const pathname = usePathname();
  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/app/cases/")
      ? "Case Vault"
      : pathname.startsWith("/app/clients/")
        ? "Client Crew"
        : "App");

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header
      className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b px-10"
      style={{
        backgroundColor: "var(--color-app-canvas)",
        borderColor: "var(--color-app-edge)",
      }}
    >
      <div>
        <div
          className="text-[11px] uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          {today}
        </div>
        <h1
          className="mt-0.5 text-[24px] font-semibold tracking-tight leading-none"
          style={{
            fontFamily: "var(--font-crimson), Georgia, serif",
            color: "var(--color-app-ink)",
          }}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <IconButton ariaLabel="Search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
            <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </IconButton>
        <div className="relative">
          <IconButton ariaLabel="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 9a6 6 0 1 1 12 0c0 5 2 7 2 7H4s2-2 2-7z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M10 19a2 2 0 0 0 4 0"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </IconButton>
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-app-copper)" }}
          />
        </div>
      </div>
    </header>
  );
}

function IconButton({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="flex h-9 w-9 items-center justify-center rounded-md transition-all"
      style={{ color: "var(--color-app-fg-soft)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-app-paper)";
        e.currentTarget.style.color = "var(--color-app-ink)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        e.currentTarget.style.color = "var(--color-app-fg-soft)";
      }}
    >
      {children}
    </button>
  );
}
