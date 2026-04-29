"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type CaseRow = {
  id: string;
  caseNo: string;
  fileNo: string;
  cnr: string;
  clientName: string;
  oppositeParty: string;
  courtName: string;
  courtPlace: string;
  status: string;
  nextHearingDate: string | null;
  updatedAt: string;
};

export default function CaseListClient({ cases }: { cases: CaseRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c) => {
      return (
        c.caseNo.toLowerCase().includes(q) ||
        c.fileNo.toLowerCase().includes(q) ||
        c.cnr.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        c.oppositeParty.toLowerCase().includes(q) ||
        c.courtName.toLowerCase().includes(q) ||
        c.courtPlace.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
      );
    });
  }, [cases, query]);

  return (
    <>
      {/* Search */}
      <div
        className="mt-7 flex items-center gap-3 rounded-xl px-5 py-3.5"
        style={{
          backgroundColor: "var(--color-app-paper)",
          boxShadow: "0 1px 0 var(--color-app-edge)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          style={{ color: "var(--color-app-fg-muted)" }}
        >
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by file no., case no., CNR, party, court..."
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-app-fg-muted"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-ink)",
          }}
        />
        {query.length > 0 && (
          <button
            onClick={() => setQuery("")}
            className="text-[11px] uppercase tracking-[0.14em] transition-colors"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-fg-muted)",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div
          className="mt-6 rounded-xl px-5 py-12 text-center"
          style={{
            backgroundColor: "var(--color-app-paper)",
            border: "1px dashed var(--color-app-edge)",
          }}
        >
          <p
            className="text-[14px]"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-muted)",
            }}
          >
            No matches for{" "}
            <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>
              &ldquo;{query}&rdquo;
            </span>
            . Try a different file no., case no., or party name.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {filtered.map((c, i) => (
            <CaseCard key={c.id} c={c} index={i} />
          ))}
        </div>
      )}
    </>
  );
}

function CaseCard({ c, index }: { c: CaseRow; index: number }) {
  const next = c.nextHearingDate ? new Date(c.nextHearingDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = next && next.toDateString() === new Date().toDateString();
  const isOverdue = next && next < today;
  const isPending = !next;

  return (
    <Link
      href={`/app/cases/${c.id}`}
      prefetch
      className="fade-up-sm group grid grid-cols-[1fr_auto] gap-5 rounded-xl p-5 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        borderLeft: "3px solid var(--color-app-copper)",
        animationDelay: `${Math.min(index, 12) * 35}ms`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 12px 28px -18px rgba(10,17,36,0.25), 0 1px 0 var(--color-app-edge)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 0 var(--color-app-edge)";
      }}
    >
      <div className="min-w-0">
        {/* Top row: case no + file no + status */}
        <div className="flex flex-wrap items-baseline gap-3">
          <span
            className="text-[22px] font-semibold tracking-tight"
            style={{
              fontFamily: "var(--font-crimson), Georgia, serif",
              color: "var(--color-app-ink)",
            }}
          >
            {c.caseNo}
          </span>
          {c.fileNo ? (
            <span
              className="text-[11px]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                color: "var(--color-app-fg-muted)",
              }}
            >
              {c.fileNo}
            </span>
          ) : null}
          {c.status ? (
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                backgroundColor: "var(--color-app-aqua-soft)",
                color: "var(--color-app-aqua)",
              }}
            >
              {c.status}
            </span>
          ) : null}
        </div>

        {/* Parties */}
        {(c.clientName || c.oppositeParty) && (
          <div
            className="mt-2 text-[14px]"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-soft)",
            }}
          >
            <span style={{ color: "var(--color-app-fg-muted)" }}>Client: </span>
            {c.clientName ? (
              <span
                style={{
                  color: "var(--color-app-ink)",
                  fontFamily: "var(--font-manrope), sans-serif",
                  fontWeight: 600,
                }}
              >
                {c.clientName}
              </span>
            ) : (
              <span style={{ color: "var(--color-app-fg-muted)" }}>—</span>
            )}
            {c.oppositeParty ? (
              <>
                {" "}
                <span style={{ color: "var(--color-app-copper-deep)" }}>vs</span>{" "}
                <span
                  style={{
                    color: "var(--color-app-ink)",
                    fontFamily: "var(--font-manrope), sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {c.oppositeParty}
                </span>
              </>
            ) : null}
          </div>
        )}

        {/* Court + CNR */}
        {(c.courtName || c.courtPlace || c.cnr) && (
          <div
            className="mt-1 text-[12px]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-fg-muted)",
            }}
          >
            {[c.courtName, c.courtPlace].filter(Boolean).join(", ")}
            {(c.courtName || c.courtPlace) && c.cnr ? (
              <span style={{ color: "var(--color-app-copper-deep)" }}> · </span>
            ) : null}
            {c.cnr ? <span>CNR {c.cnr}</span> : null}
          </div>
        )}
      </div>

      {/* Right column: next date */}
      <div className="text-right">
        <div
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Next date
        </div>
        {next ? (
          <div
            className="mt-1 text-[18px] font-semibold tabular-nums"
            style={{
              fontFamily: "var(--font-crimson), Georgia, serif",
              color: isOverdue
                ? "var(--color-app-danger)"
                : isToday
                  ? "var(--color-app-copper-deep)"
                  : "var(--color-app-ink)",
            }}
          >
            {next.toISOString().slice(0, 10)}
          </div>
        ) : (
          <div
            className="mt-1 inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              backgroundColor: "var(--color-app-copper)",
              color: "var(--color-app-copper-text)",
            }}
          >
            Pending
          </div>
        )}
      </div>
    </Link>
  );
}
