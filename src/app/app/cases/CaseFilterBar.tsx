"use client";

import { useEffect, useState } from "react";
import type { CaseVaultBootstrap } from "./CaseVaultClient";
import type { CaseFilters } from "./case-vault-types";
import { EMPTY_FILTERS } from "./case-vault-types";

// Top filter strip — court place, court, advocate, hearing-date range,
// Apply. Holds a local "draft" copy of the filter tuple while the user
// is fiddling; only flushes upward on Apply. Reset clears the draft AND
// pushes empty filters so the URL clears too.

export default function CaseFilterBar({
  bootstrap,
  appliedFilters,
  onApply,
}: {
  bootstrap: CaseVaultBootstrap;
  appliedFilters: CaseFilters;
  onApply: (next: CaseFilters) => void;
}) {
  const [draft, setDraft] = useState<CaseFilters>(appliedFilters);

  // Keep the draft in sync with what's actually applied when the URL
  // changes from somewhere else (back button, copy-paste link). The
  // dependency on a stringified snapshot avoids a render loop.
  const appliedKey = JSON.stringify(appliedFilters);
  useEffect(() => {
    setDraft(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedKey]);

  const hasActiveFilters =
    appliedFilters.courtId ||
    appliedFilters.courtPlace ||
    appliedFilters.advocateId ||
    appliedFilters.fromDate ||
    appliedFilters.toDate;

  function set<K extends keyof CaseFilters>(key: K, value: CaseFilters[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function applyDraft(next: CaseFilters = draft) {
    onApply(next);
  }

  function reset() {
    const cleared: CaseFilters = {
      ...EMPTY_FILTERS,
      // Don't blow away the user's chosen limit and search just because
      // they cleared the structural filters — those live on the row 2 bar.
      search: appliedFilters.search,
      searchScope: appliedFilters.searchScope,
      limit: appliedFilters.limit,
    };
    setDraft(cleared);
    onApply(cleared);
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          label="Court Place"
          value={draft.courtPlace}
          onChange={(v) => set("courtPlace", v)}
          placeholder="Any place"
          options={bootstrap.courtPlaces.map((p) => ({ value: p, label: p }))}
        />
        <SelectField
          label="Court Name"
          value={draft.courtId}
          onChange={(v) => set("courtId", v)}
          placeholder="Any court"
          options={bootstrap.courts.map((c) => ({
            value: c.id,
            label: c.number
              ? `${c.name} · ${c.number}`
              : c.name,
            sub: c.place || undefined,
          }))}
        />
        <SelectField
          label="Advocate"
          value={draft.advocateId}
          onChange={(v) => set("advocateId", v)}
          placeholder="Any advocate"
          options={bootstrap.advocates.map((a) => ({
            value: a.id,
            label: a.name,
            sub: a.role,
          }))}
        />
        <DateField
          label="Start Date"
          value={draft.fromDate}
          onChange={(v) => set("fromDate", v)}
        />
        <DateField
          label="End Date"
          value={draft.toDate}
          onChange={(v) => set("toDate", v)}
        />

        <div className="ml-auto flex items-end gap-2">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={reset}
              className="rounded-md px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                backgroundColor: "transparent",
                color: "var(--color-app-fg-muted)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--color-app-ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--color-app-fg-muted)";
              }}
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => applyDraft()}
            className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] transition-all hover:-translate-y-0.5"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              backgroundColor: "var(--color-app-copper)",
              color: "var(--color-app-copper-text)",
              boxShadow: "0 8px 18px -10px rgba(197,133,58,0.6)",
            }}
          >
            <FilterIcon />
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

type SelectOption = {
  value: string;
  label: string;
  sub?: string;
};

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  return (
    <div className="min-w-[180px] flex-1">
      <label
        className="block text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-fg-muted)",
        }}
      >
        {label}
      </label>
      <div className="relative mt-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full appearance-none rounded-md border bg-transparent px-3.5 py-2.5 pr-9 text-[13.5px] outline-none transition-all"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            borderColor: value
              ? "var(--color-app-copper)"
              : "var(--color-app-edge)",
            backgroundColor: "var(--color-app-paper)",
            color: value ? "var(--color-app-ink)" : "var(--color-app-fg-soft)",
          }}
        >
          <option value="">{placeholder || "—"}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.sub ? `${opt.label} — ${opt.sub}` : opt.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--color-app-fg-muted)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-w-[150px] flex-1">
      <label
        className="block text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-fg-muted)",
        }}
      >
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block w-full rounded-md border px-3 py-2.5 text-[13.5px] outline-none transition-all"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          borderColor: value
            ? "var(--color-app-copper)"
            : "var(--color-app-edge)",
          backgroundColor: "var(--color-app-paper)",
          color: value ? "var(--color-app-ink)" : "var(--color-app-fg-soft)",
        }}
      />
    </div>
  );
}

function FilterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6h18M6 12h12M10 18h4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
