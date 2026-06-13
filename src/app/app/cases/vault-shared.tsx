"use client";

// Pieces shared by both Case Vault views (CaseTable + CaseCards) so the
// empty state and the "Showing X of Y" footer stay identical and live in
// one place rather than being copy-pasted per view.

import Link from "next/link";
import type { CaseFilters } from "./case-vault-types";

// True when any filter (structural or search) is narrowing the list — the
// empty state uses this to choose between "no matches" and "vault empty".
export function hasAnyFilter(f: CaseFilters): boolean {
  return Boolean(
    f.courtId ||
      f.courtPlace ||
      f.advocateId ||
      f.fromDate ||
      f.toDate ||
      f.search
  );
}

// The empty-state body. Callers supply the surrounding container (a full-
// width <td> for the table, a centred card for the grid) — this returns
// only the message so it sits cleanly in either.
export function EmptyVault({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <p
        className="text-[14px]"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-fg-muted)",
        }}
      >
        No matters match your current filters. Try widening the date range
        or clearing a filter from the row above.
      </p>
    );
  }
  return (
    <div>
      <p
        className="text-[16px] font-semibold"
        style={{
          fontFamily: "var(--font-crimson), Georgia, serif",
          color: "var(--color-app-ink)",
        }}
      >
        The vault is empty.
      </p>
      <p
        className="mt-2 text-[13px]"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-fg-muted)",
        }}
      >
        Tap{" "}
        <Link
          href="/app/cases/new"
          style={{ color: "var(--color-app-copper-deep)", fontWeight: 600 }}
        >
          + New Case
        </Link>{" "}
        above to file your first matter.
      </p>
    </div>
  );
}

// The status line that hangs under whichever view is showing. Mirrors the
// table's old gate: hidden while the very first load is still in flight
// (nothing rendered yet), otherwise it reports the count and shows a
// "Refreshing…" pulse during background refetches.
export function VaultFooter({
  showing,
  total,
  loading,
}: {
  showing: number;
  total: number;
  loading: boolean;
}) {
  if (loading && showing === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <span
        className="text-[11px]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-fg-muted)",
          letterSpacing: 0.3,
        }}
      >
        Showing{" "}
        <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>
          {showing}
        </span>{" "}
        of{" "}
        <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>
          {total}
        </span>{" "}
        {total === 1 ? "matter" : "matters"}
        {total > showing ? (
          <span style={{ color: "var(--color-app-copper-deep)" }}>
            {" "}
            · raise the row limit above to see more
          </span>
        ) : null}
      </span>
      {loading && showing > 0 ? (
        <span
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full"
            style={{ backgroundColor: "var(--color-app-copper)" }}
          />
          Refreshing…
        </span>
      ) : null}
    </div>
  );
}
