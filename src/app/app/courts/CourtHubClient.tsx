"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type CourtRow = {
  id: string;
  name: string;
  number: string;
  place: string;
  caseCount: number;
};

type SortDir = "asc" | "desc";

export default function CourtHubClient({
  initialCourts,
}: {
  initialCourts: CourtRow[];
}) {
  const [courts, setCourts] = useState<CourtRow[]>(initialCourts);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleAdded(c: CourtRow) {
    // Prepend the new court — the sort effect below will put it in the
    // right slot. We don't re-sort manually here because the displayed
    // order should follow the user's chosen direction.
    setCourts((prev) => [c, ...prev]);
  }

  // Court-number sort. We extract the first numeric token from the
  // string ("Hall 3" → 3, "Court 12" → 12, "2" → 2) so chambers can
  // type the number either bare or alongside a prefix. Courts with no
  // numeric token sit at the end regardless of direction so they
  // don't drown out the meaningful sort, and the alphabetical name
  // is the tie-breaker.
  const sortedCourts = useMemo(() => {
    const list = courts.slice();
    list.sort((a, b) => {
      const na = firstNumber(a.number);
      const nb = firstNumber(b.number);
      const aHas = na !== null;
      const bHas = nb !== null;
      if (aHas && bHas) {
        if (na !== nb) {
          return sortDir === "asc" ? na - nb : nb - na;
        }
        return a.name.localeCompare(b.name);
      }
      if (aHas) return -1;
      if (bHas) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [courts, sortDir]);

  return (
    <>
      {/* Header */}
      <div>
        <h2
          className="text-[40px] font-semibold tracking-tight leading-[1.1]"
          style={{
            fontFamily: "var(--font-crimson), Georgia, serif",
            color: "var(--color-app-ink)",
          }}
        >
          Court Hub
        </h2>
        <p
          className="mt-2 text-[13px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Reusable court master used across all cases.
        </p>
      </div>

      <AddCourtForm onAdded={handleAdded} />

      {courts.length === 0 ? (
        <EmptyHub />
      ) : (
        <>
          <SortBar
            sortDir={sortDir}
            onToggle={() =>
              setSortDir((d) => (d === "asc" ? "desc" : "asc"))
            }
            count={courts.length}
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedCourts.map((c, i) => (
              <CourtCard key={c.id} c={c} index={i} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function firstNumber(s: string): number | null {
  if (!s) return null;
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function SortBar({
  sortDir,
  onToggle,
  count,
}: {
  sortDir: SortDir;
  onToggle: () => void;
  count: number;
}) {
  return (
    <div className="mt-7 flex items-center justify-between gap-3">
      <span
        className="text-[11px] uppercase tracking-[0.22em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-fg-muted)",
        }}
      >
        {count} {count === 1 ? "court" : "courts"} on the rolls
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          borderColor: "var(--color-app-edge)",
          backgroundColor: "var(--color-app-paper)",
          color: "var(--color-app-ink)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--color-app-copper)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--color-app-edge)";
        }}
        aria-label={
          sortDir === "asc"
            ? "Sorted by court number ascending — click to switch to descending"
            : "Sorted by court number descending — click to switch to ascending"
        }
      >
        <span
          className="text-[10px]"
          style={{ color: "var(--color-app-fg-muted)" }}
        >
          Sort
        </span>
        <span>Court no.</span>
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded transition-transform"
          style={{
            backgroundColor: "var(--color-app-copper)",
            color: "var(--color-app-copper-text)",
            transform: sortDir === "asc" ? "rotate(0deg)" : "rotate(180deg)",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4v16M5 11l7-7 7 7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>
  );
}

function AddCourtForm({
  onAdded,
}: {
  onAdded: (c: CourtRow) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [place, setPlace] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setMissing(true);
      setError("Court name is required.");
      return;
    }
    setMissing(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/app/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, number, place }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save");
        setSubmitting(false);
        return;
      }
      onAdded(data.court);
      setName("");
      setNumber("");
      setPlace("");
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-7 rounded-2xl p-6"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
      }}
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        <Field
          label="Court Number"
          value={number}
          onChange={setNumber}
          placeholder="Hall 3"
        />
        <Field
          label="Court Name"
          value={name}
          onChange={(v) => {
            setName(v);
            if (missing && v.trim()) setMissing(false);
          }}
          placeholder="District Court"
          invalid={missing}
        />
        <Field
          label="Place"
          value={place}
          onChange={setPlace}
          placeholder="Chennai"
        />
        <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md px-6 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              backgroundColor: "var(--color-app-copper)",
              color: "var(--color-app-copper-text)",
              opacity: submitting ? 0.6 : 1,
              boxShadow: "0 8px 20px -10px rgba(197,133,58,0.6)",
              minWidth: 150,
            }}
          >
            <span aria-hidden>+</span>
            {submitting ? "Adding…" : "Add Court"}
          </button>
        </div>
      </div>

      {error ? (
        <p
          className="mt-3 text-[12px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-danger)",
          }}
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}

function CourtCard({ c, index }: { c: CourtRow; index: number }) {
  const subtitle = [c.number, c.place].filter(Boolean).join(" · ");
  return (
    <div
      className="fade-up-sm flex items-center gap-4 rounded-xl p-5 transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        animationDelay: `${Math.min(index, 12) * 35}ms`,
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: "var(--color-app-canvas-2)" }}
      >
        <BuildingIcon />
      </div>
      <div className="min-w-0 flex-1">
        <h3
          className="text-[20px] font-semibold tracking-tight leading-[1.2]"
          style={{
            fontFamily: "var(--font-crimson), Georgia, serif",
            color: "var(--color-app-ink)",
          }}
        >
          {c.name}
        </h3>
        {subtitle ? (
          <p
            className="mt-0.5 text-[12px]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-fg-muted)",
              letterSpacing: 0.3,
            }}
          >
            {subtitle}
          </p>
        ) : null}
        {c.caseCount > 0 ? (
          <p
            className="mt-1 text-[11px]"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-soft)",
            }}
          >
            <span style={{ color: "var(--color-app-copper-deep)", fontWeight: 600 }}>
              {c.caseCount}
            </span>{" "}
            {c.caseCount === 1 ? "matter" : "matters"} on the rolls
          </p>
        ) : null}
      </div>
    </div>
  );
}

function EmptyHub() {
  return (
    <div
      className="mt-5 rounded-xl p-12 text-center"
      style={{
        backgroundColor: "var(--color-app-paper)",
        border: "1px dashed var(--color-app-edge)",
      }}
    >
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--color-app-canvas-2)",
          color: "var(--color-app-copper-deep)",
        }}
      >
        <BuildingIcon size={22} />
      </div>
      <h3
        className="mt-5 text-[24px] font-semibold tracking-tight"
        style={{
          fontFamily: "var(--font-crimson), Georgia, serif",
          color: "var(--color-app-ink)",
        }}
      >
        No courts yet.
      </h3>
      <p
        className="mx-auto mt-2 max-w-md text-[13px] leading-7"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-fg-muted)",
        }}
      >
        Add the courts your office practises in. Once added, they're reusable
        across the case vault, hearing track and exports.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div>
      <label
        className="text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-fg-muted)",
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-md border px-3.5 py-2.5 text-[14px] outline-none transition-all"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          borderColor: invalid
            ? "var(--color-app-danger)"
            : "var(--color-app-edge)",
          backgroundColor: "var(--color-app-paper)",
          color: "var(--color-app-ink)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-app-copper)";
          e.currentTarget.style.boxShadow =
            "0 0 0 3px rgba(197,133,58,0.15)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = invalid
            ? "var(--color-app-danger)"
            : "var(--color-app-edge)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

function BuildingIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 11h.01M12 11h.01M15 11h.01"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
