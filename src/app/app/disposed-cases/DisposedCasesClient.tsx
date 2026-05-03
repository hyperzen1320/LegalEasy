"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type DisposedCaseRow = {
  id: string;
  caseNo: string;
  fileNo: string;
  cnr: string;
  clientName: string;
  oppositeParty: string;
  courtName: string;
  courtPlace: string;
  status: string;
  disposedAt: string | null;
  disposalRemarks: string;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DisposedCasesClient({
  cases,
}: {
  cases: DisposedCaseRow[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.caseNo.toLowerCase().includes(q) ||
        c.fileNo.toLowerCase().includes(q) ||
        c.cnr.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        c.oppositeParty.toLowerCase().includes(q) ||
        c.courtName.toLowerCase().includes(q) ||
        c.courtPlace.toLowerCase().includes(q)
    );
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
          <path
            d="M16 16l5 5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search archived matters by file no., case no., CNR, party, court..."
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
            No archived matches for{" "}
            <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>
              &ldquo;{query}&rdquo;
            </span>
            .
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {filtered.map((c, i) => (
            <DisposedCard key={c.id} c={c} index={i} />
          ))}
        </div>
      )}
    </>
  );
}

function DisposedCard({
  c,
  index,
}: {
  c: DisposedCaseRow;
  index: number;
}) {
  return (
    <Link
      href={`/app/cases/${c.id}`}
      prefetch
      className="fade-up-sm group grid grid-cols-[1fr_auto] gap-5 rounded-xl p-5 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        // Slate accent on the left edge to visually distinguish archived
        // matters from the copper-accented active vault.
        borderLeft: "3px solid var(--color-app-fg-muted)",
        animationDelay: `${Math.min(index, 12) * 35}ms`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 12px 28px -18px rgba(10,17,36,0.22), 0 1px 0 var(--color-app-edge)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 0 var(--color-app-edge)";
      }}
    >
      <div className="min-w-0">
        {/* Top row: case no + file no + DISPOSED pill */}
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
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              backgroundColor: "var(--color-app-ink)",
              color: "var(--color-app-ivory)",
            }}
          >
            Disposed
          </span>
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

        {/* Disposal remarks if any */}
        {c.disposalRemarks ? (
          <p
            className="mt-2 text-[12px] italic leading-snug"
            style={{
              fontFamily: "var(--font-crimson), Georgia, serif",
              color: "var(--color-app-fg-soft)",
            }}
          >
            “{c.disposalRemarks}”
          </p>
        ) : null}
      </div>

      {/* Right column: disposal date */}
      <div className="text-right">
        <div
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Disposed on
        </div>
        <div
          className="mt-1 text-[18px] font-semibold tabular-nums"
          style={{
            fontFamily: "var(--font-crimson), Georgia, serif",
            color: "var(--color-app-ink)",
          }}
        >
          {fmtDate(c.disposedAt)}
        </div>
      </div>
    </Link>
  );
}
