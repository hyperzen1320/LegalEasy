"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  filtersFromQuery,
  filtersToQuery,
  type CaseColumnKey,
  type CaseFilters,
  type CaseRow,
  type CourtOption,
  type AdvocateOption,
} from "./case-vault-types";
import CaseFilterBar from "./CaseFilterBar";
import CaseSearchBar from "./CaseSearchBar";
import CaseTable from "./CaseTable";

export type CaseVaultBootstrap = {
  courts: CourtOption[];
  courtPlaces: string[];
  advocates: AdvocateOption[];
  partnerId: string;
};

// CaseVaultClient — the orchestrator.
//
// Owns:
//   • The filter tuple, mirrored to the URL via router.replace so a
//     copy-pasted link re-opens the same view. Read on mount, written
//     on every Apply (filter bar) or input commit (search bar).
//   • The fetched rows + pagination meta. Re-fetches whenever the URL
//     filters change.
//   • Column visibility, persisted to localStorage per partner so each
//     office user keeps their layout across sessions.
//   • A small disposing-spinner state on the row delete action so the
//     row dims while the PATCH-to-Disposed flies.
//
// The visible UI is split across three subcomponents — CaseFilterBar,
// CaseSearchBar, CaseTable — each of which is small enough to read on
// its own. This file is the glue.

export default function CaseVaultClient({
  bootstrap,
}: {
  bootstrap: CaseVaultBootstrap;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL → applied filters. Anything in the URL is what's currently
  // filtering the displayed rows. The filter bar's local "draft" state
  // lives inside CaseFilterBar — it only flushes here on Apply.
  const appliedFilters: CaseFilters = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return filtersFromQuery(params);
  }, [searchParams]);

  // Column visibility. Default selection mirrors what's marked
  // `default: true` in the column registry. Persisted under a
  // partner-scoped key so two users on shared hardware see their own
  // views.
  const visibilityKey = `legaleasy.caseVaultColumns.${bootstrap.partnerId}`;
  const [visibleColumns, setVisibleColumns] = useState<CaseColumnKey[]>(
    DEFAULT_VISIBLE_COLUMNS
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(visibilityKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter((k): k is CaseColumnKey =>
        COLUMNS.some((c) => c.key === k)
      );
      // Always keep S.No + Actions visible regardless of what was saved.
      const always = COLUMNS.filter((c) => !c.togglable).map((c) => c.key);
      const merged = new Set<CaseColumnKey>([...always, ...valid]);
      setVisibleColumns(
        COLUMNS.filter((c) => merged.has(c.key)).map((c) => c.key)
      );
    } catch {
      // Corrupt localStorage entry — ignore, the defaults stand.
    }
  }, [visibilityKey]);

  const persistVisibility = useCallback(
    (next: CaseColumnKey[]) => {
      setVisibleColumns(next);
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(visibilityKey, JSON.stringify(next));
      } catch {
        /* localStorage disabled — accept the ephemeral state. */
      }
    },
    [visibilityKey]
  );

  // Fetched rows + meta + loading state.
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Optimistically hidden ids — when the user clicks delete on a row
  // we drop it from the view immediately, then ask the server to
  // refresh. Avoids the ~200ms flash where the disposed row would
  // still render while the page round-trips.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const requestRef = useRef(0);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const seq = ++requestRef.current;
    try {
      const params = filtersToQuery(appliedFilters);
      // Always pass the limit explicitly so the server agrees with the UI's
      // "Showing N of M" line even when the URL omitted the param.
      params.set("limit", String(appliedFilters.limit));
      const res = await fetch(`/api/app/cases?${params.toString()}`, {
        cache: "no-store",
      });
      if (seq !== requestRef.current) return; // a newer request started — drop this result
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error || "Couldn't load cases.");
        setRows([]);
        setTotal(0);
        return;
      }
      setRows((data.cases || []) as CaseRow[]);
      setTotal(Number(data.total || 0));
      setHidden(new Set());
    } catch {
      if (seq !== requestRef.current) return;
      setError("Network error. Try again.");
      setRows([]);
      setTotal(0);
    } finally {
      if (seq === requestRef.current) setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const writeFiltersToUrl = useCallback(
    (next: CaseFilters) => {
      const params = filtersToQuery(next);
      const qs = params.toString();
      router.replace(qs ? `/app/cases?${qs}` : `/app/cases`, {
        scroll: false,
      });
    },
    [router]
  );

  const handleApplyFilters = useCallback(
    (next: CaseFilters) => {
      writeFiltersToUrl(next);
    },
    [writeFiltersToUrl]
  );

  // The search bar can change two non-filter things — search/scope/limit
  // (which DO live in the URL) and the visibility column list (which
  // lives in localStorage). Splitting handlers keeps each side small.
  const handleApplySearch = useCallback(
    (next: CaseFilters) => {
      writeFiltersToUrl(next);
    },
    [writeFiltersToUrl]
  );

  const handleColumnsChange = useCallback(
    (next: CaseColumnKey[]) => {
      persistVisibility(next);
    },
    [persistVisibility]
  );

  const handleDispose = useCallback(
    async (row: CaseRow) => {
      const confirmMsg = `Move ${row.caseNo || "this matter"} to Disposed Cases? You can reopen it later from the archive.`;
      if (typeof window !== "undefined" && !window.confirm(confirmMsg)) {
        return;
      }
      // Hide immediately so the row vanishes without waiting on the
      // round-trip. The next fetch reconciles authoritatively.
      setHidden((prev) => {
        const next = new Set(prev);
        next.add(row.id);
        return next;
      });
      try {
        const res = await fetch(`/api/app/cases/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Disposed" }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(
            data?.error ||
              "Couldn't move that matter to Disposed. Try again."
          );
          // Restore the row since the action failed.
          setHidden((prev) => {
            const next = new Set(prev);
            next.delete(row.id);
            return next;
          });
          return;
        }
        // Successful — pull fresh data so the count + neighbour rows update.
        fetchRows();
      } catch {
        setError("Network error. Try again.");
        setHidden((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [fetchRows]
  );

  const visibleRows = useMemo(
    () => rows.filter((r) => !hidden.has(r.id)),
    [rows, hidden]
  );

  return (
    <div className="mt-7 space-y-5">
      <CaseFilterBar
        bootstrap={bootstrap}
        appliedFilters={appliedFilters}
        onApply={handleApplyFilters}
      />

      <CaseSearchBar
        appliedFilters={appliedFilters}
        visibleColumns={visibleColumns}
        onApply={handleApplySearch}
        onColumnsChange={handleColumnsChange}
      />

      {error ? (
        <div
          className="rounded-md px-4 py-3 text-[13px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: "var(--color-app-danger-soft)",
            border: "1px solid var(--color-app-danger)",
            color: "var(--color-app-ink)",
          }}
        >
          {error}
        </div>
      ) : null}

      <CaseTable
        rows={visibleRows}
        total={total}
        loading={loading}
        visibleColumns={visibleColumns}
        appliedFilters={appliedFilters}
        onDispose={handleDispose}
      />
    </div>
  );
}
