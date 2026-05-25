"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Cards removed from view the moment they're disposed — we don't want a
  // ~300ms flicker between "Yes, dispose" and the server-driven refresh.
  // The server is still the source of truth; this set is cleared on next
  // render of the page.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Per-card disposal banner (shown briefly after success — disappears
  // once the route refresh lands).
  const [busyId, setBusyId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const visible = cases.filter((c) => !hidden.has(c.id));
    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((c) => {
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
  }, [cases, query, hidden]);

  const dispose = useCallback(
    async (c: CaseRow) => {
      setGlobalError(null);
      setBusyId(c.id);
      try {
        const res = await fetch(`/api/app/cases/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Disposed" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setGlobalError(
            data?.error ||
              "Couldn't move this matter to Disposed Cases. Try again."
          );
          setBusyId(null);
          return;
        }
        // Optimistically hide from this list — Case Vault filters on
        // disposedAt: null so a refetch would drop it anyway. Then ask the
        // route to refresh so all the other surfaces (dashboard, hearing
        // track, sidebar counts) catch up.
        setHidden((prev) => {
          const next = new Set(prev);
          next.add(c.id);
          return next;
        });
        setBusyId(null);
        router.refresh();
      } catch {
        setGlobalError("Network error. Try again.");
        setBusyId(null);
      }
    },
    [router]
  );

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

      {globalError ? (
        <div
          className="mt-5 rounded-md px-4 py-3 text-[13px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: "var(--color-app-danger-soft)",
            border: "1px solid var(--color-app-danger)",
            color: "var(--color-app-ink)",
          }}
        >
          {globalError}
        </div>
      ) : null}

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
            {query.trim() ? (
              <>
                No matches for{" "}
                <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>
                  &ldquo;{query}&rdquo;
                </span>
                . Try a different file no., case no., or party name.
              </>
            ) : (
              "No active matters yet. Tap “Add Case” to file your first one."
            )}
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {filtered.map((c, i) => (
            <CaseCard
              key={c.id}
              c={c}
              index={i}
              busy={busyId === c.id}
              onDispose={dispose}
            />
          ))}
        </div>
      )}
    </>
  );
}

function CaseCard({
  c,
  index,
  busy,
  onDispose,
}: {
  c: CaseRow;
  index: number;
  busy: boolean;
  onDispose: (c: CaseRow) => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const next = c.nextHearingDate ? new Date(c.nextHearingDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = next && next.toDateString() === new Date().toDateString();
  const isOverdue = next && next < today;

  // Clicks on the card body open the detail page; clicks inside the action
  // strip on the right are stopped so they only trigger the inner button /
  // link. We use onClick instead of wrapping in a <Link> because anchors
  // can't legally contain other anchors (Edit) or interactive content
  // (Delete confirm).
  function openDetail() {
    if (busy) return;
    router.push(`/app/cases/${c.id}`);
  }

  return (
    <article
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetail();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`Open ${c.caseNo}`}
      className="fade-up-sm group grid cursor-pointer grid-cols-[1fr_auto] gap-5 rounded-xl p-5 outline-none transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        borderLeft: "3px solid var(--color-app-copper)",
        animationDelay: `${Math.min(index, 12) * 35}ms`,
        opacity: busy ? 0.55 : 1,
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

      {/* Right column: next date + per-row actions. The wrapper swallows
          click events so the article's openDetail handler stays out of
          the way of the Edit link and the Delete confirm flow. */}
      <div
        className="flex flex-col items-end gap-3 text-right"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div>
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

        {confirming ? (
          <ConfirmStrip
            label="Move to Disposed?"
            busy={busy}
            onConfirm={() => {
              setConfirming(false);
              onDispose(c);
            }}
            onCancel={() => setConfirming(false)}
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <Link
              href={`/app/cases/${c.id}/edit`}
              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                borderColor: "var(--color-app-edge)",
                backgroundColor: "var(--color-app-paper)",
                color: "var(--color-app-fg-soft)",
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  "var(--color-app-copper)";
                e.currentTarget.style.color = "var(--color-app-ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  "var(--color-app-edge)";
                e.currentTarget.style.color = "var(--color-app-fg-soft)";
              }}
            >
              <PencilIcon /> Edit
            </Link>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                borderColor: "var(--color-app-danger)",
                backgroundColor: "var(--color-app-paper)",
                color: "var(--color-app-danger)",
                letterSpacing: 0.4,
                textTransform: "uppercase",
                opacity: busy ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (busy) return;
                e.currentTarget.style.backgroundColor =
                  "var(--color-app-danger-soft)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-app-paper)";
              }}
            >
              <TrashIcon /> Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function ConfirmStrip({
  label,
  busy,
  onConfirm,
  onCancel,
}: {
  label: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-md px-2.5 py-1.5"
      style={{
        backgroundColor: "var(--color-app-danger-soft)",
        border: "1px solid var(--color-app-danger)",
      }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-danger)",
        }}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          backgroundColor: "var(--color-app-danger)",
          color: "white",
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "…" : "Yes"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          backgroundColor: "var(--color-app-paper)",
          color: "var(--color-app-fg-soft)",
          border: "1px solid var(--color-app-edge)",
        }}
      >
        No
      </button>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10-10-4-4L4 16v4z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 6l4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
