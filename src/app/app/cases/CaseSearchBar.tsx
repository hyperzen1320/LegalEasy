"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_SEARCH_SCOPE,
  LIMIT_OPTIONS,
  SEARCH_SCOPE_OPTIONS,
  type CaseColumnKey,
  type CaseFilters,
  type SearchScope,
} from "./case-vault-types";
import ColumnVisibilityMenu from "./ColumnVisibilityMenu";
import ExportMenu from "./ExportMenu";

// Second filter row — "Search in [scope] · [text input] · Show N · Columns · Export".
// Scope, limit and search input all live in the URL via filters; columns
// live in localStorage so are passed in directly. Enter in the search
// input is the same as clicking Apply Filters — we don't make the user
// reach for the mouse to commit a search.

export default function CaseSearchBar({
  appliedFilters,
  visibleColumns,
  onApply,
  onColumnsChange,
}: {
  appliedFilters: CaseFilters;
  visibleColumns: CaseColumnKey[];
  onApply: (next: CaseFilters) => void;
  onColumnsChange: (next: CaseColumnKey[]) => void;
}) {
  // The search input is the only thing on this row with a noticeable
  // typing cadence — local draft so we don't push to the URL on every
  // keystroke. Other inputs commit immediately.
  const [searchDraft, setSearchDraft] = useState(appliedFilters.search);
  const appliedSearch = appliedFilters.search;
  useEffect(() => {
    setSearchDraft(appliedSearch);
  }, [appliedSearch]);

  // Scope checkbox panel state.
  const [scopeOpen, setScopeOpen] = useState(false);
  const scopeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!scopeOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!scopeRef.current) return;
      if (!scopeRef.current.contains(e.target as Node)) setScopeOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [scopeOpen]);

  const scopeSet = new Set(appliedFilters.searchScope);
  function toggleScope(key: SearchScope) {
    const next = new Set(scopeSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const ordered = SEARCH_SCOPE_OPTIONS.filter((o) => next.has(o.key)).map(
      (o) => o.key
    );
    // Empty scope = use default rather than "search in nothing" which
    // would block the user from ever seeing search results again.
    const safe = ordered.length > 0 ? ordered : DEFAULT_SEARCH_SCOPE;
    onApply({ ...appliedFilters, searchScope: safe });
  }
  function resetScope() {
    onApply({ ...appliedFilters, searchScope: DEFAULT_SEARCH_SCOPE });
  }

  const scopeLabel =
    appliedFilters.searchScope.length === DEFAULT_SEARCH_SCOPE.length
      ? "All searchable"
      : appliedFilters.searchScope.length === 1
        ? SEARCH_SCOPE_OPTIONS.find(
            (o) => o.key === appliedFilters.searchScope[0]
          )?.label || "All searchable"
        : `${appliedFilters.searchScope.length} fields`;

  function commitSearch() {
    if (searchDraft === appliedFilters.search) return;
    onApply({ ...appliedFilters, search: searchDraft });
  }

  function clearSearch() {
    setSearchDraft("");
    if (appliedFilters.search) {
      onApply({ ...appliedFilters, search: "" });
    }
  }

  function setLimit(value: number) {
    if (value === appliedFilters.limit) return;
    onApply({ ...appliedFilters, limit: value });
  }

  return (
    <div
      className="flex flex-wrap items-end gap-3 rounded-xl p-4"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
      }}
    >
      {/* Search scope dropdown */}
      <div className="min-w-[180px]" ref={scopeRef}>
        <label
          className="block text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Search in
        </label>
        <div className="relative mt-2">
          <button
            type="button"
            onClick={() => setScopeOpen((v) => !v)}
            className="block w-full rounded-md border px-3.5 py-2.5 pr-9 text-left text-[13.5px] outline-none transition-all"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              borderColor: scopeOpen
                ? "var(--color-app-copper)"
                : "var(--color-app-edge)",
              backgroundColor: "var(--color-app-paper)",
              color: "var(--color-app-ink)",
            }}
          >
            {scopeLabel}
          </button>
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
          {scopeOpen ? (
            <div
              className="absolute left-0 right-0 z-30 mt-2 max-h-[340px] overflow-y-auto rounded-md"
              style={{
                backgroundColor: "var(--color-app-paper)",
                border: "1px solid var(--color-app-edge)",
                boxShadow:
                  "0 16px 32px -12px rgba(10,17,36,0.25), 0 0 0 1px rgba(10,17,36,0.04)",
              }}
            >
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{
                  borderBottom: "1px solid var(--color-app-edge-soft)",
                  backgroundColor: "var(--color-app-canvas-2)",
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    fontFamily: "var(--font-dm-mono), monospace",
                    color: "var(--color-app-fg-muted)",
                  }}
                >
                  Fields to search
                </span>
                <button
                  type="button"
                  onClick={resetScope}
                  className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    fontFamily: "var(--font-dm-mono), monospace",
                    color: "var(--color-app-copper-deep)",
                  }}
                >
                  All
                </button>
              </div>
              <ul className="py-1">
                {SEARCH_SCOPE_OPTIONS.map((opt) => {
                  const checked = scopeSet.has(opt.key);
                  return (
                    <li key={opt.key}>
                      <label
                        className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[12.5px] transition-colors"
                        style={{
                          fontFamily: "var(--font-manrope), sans-serif",
                          color: "var(--color-app-ink)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "var(--color-app-canvas-2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "transparent";
                        }}
                      >
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] transition-colors"
                          style={{
                            backgroundColor: checked
                              ? "var(--color-app-copper)"
                              : "var(--color-app-paper)",
                            border: checked
                              ? "1px solid var(--color-app-copper)"
                              : "1.5px solid var(--color-app-edge)",
                          }}
                        >
                          {checked ? (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M5 12l5 5L20 7"
                                stroke="var(--color-app-copper-text)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : null}
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleScope(opt.key)}
                          className="sr-only"
                        />
                        {opt.label}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* Search input */}
      <div className="min-w-[260px] flex-1">
        <label
          className="block text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Search
        </label>
        <div className="relative mt-2">
          <input
            type="text"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitSearch();
              }
            }}
            onBlur={commitSearch}
            placeholder="Search across the rolls…"
            className="block w-full rounded-md border px-3.5 py-2.5 pr-9 text-[13.5px] outline-none transition-all"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              borderColor: searchDraft
                ? "var(--color-app-copper)"
                : "var(--color-app-edge)",
              backgroundColor: "var(--color-app-paper)",
              color: "var(--color-app-ink)",
            }}
          />
          {searchDraft ? (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[12px] transition-colors"
              style={{
                color: "var(--color-app-fg-muted)",
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {/* Limit dropdown */}
      <div className="min-w-[120px]">
        <label
          className="block text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Show
        </label>
        <div className="relative mt-2">
          <select
            value={appliedFilters.limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="block w-full appearance-none rounded-md border bg-transparent px-3.5 py-2.5 pr-9 text-[13.5px] outline-none transition-all"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              borderColor: "var(--color-app-edge)",
              backgroundColor: "var(--color-app-paper)",
              color: "var(--color-app-ink)",
            }}
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} rows
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

      {/* Columns + Export — right-anchored. */}
      <div className="ml-auto flex items-end gap-2">
        <ColumnVisibilityMenu
          visible={visibleColumns}
          onChange={onColumnsChange}
        />
        <ExportMenu
          filters={appliedFilters}
          visibleColumns={visibleColumns}
        />
      </div>
    </div>
  );
}
