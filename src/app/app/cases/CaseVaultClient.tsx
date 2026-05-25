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
import CaseToolBar from "./CaseToolBar";
import CaseTable from "./CaseTable";
import RequestDeleteDialog, {
  type RequestTarget,
} from "@/app/app/workflow/[id]/RequestDeleteDialog";

export type CaseVaultBootstrap = {
  courts: CourtOption[];
  courtPlaces: string[];
  advocates: AdvocateOption[];
  partnerId: string;
  isAdmin: boolean;
};

// CaseVaultClient — the orchestrator.
//
// Owns:
//   • The filter tuple, mirrored to the URL via router.replace so a
//     copy-pasted link re-opens the same view.
//   • The fetched rows + pagination meta. Re-fetches whenever the URL
//     filters change.
//   • Column visibility, persisted to localStorage per partner.
//   • The Delete-action gate: admins dispose directly; non-admins
//     route into the RequestDeleteDialog (POST /api/app/delete-requests)
//     so the admin can approve via Activity → Delete Requests or via
//     the bell-icon dropdown.

export default function CaseVaultClient({
  bootstrap,
}: {
  bootstrap: CaseVaultBootstrap;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL → applied filters.
  const appliedFilters: CaseFilters = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    return filtersFromQuery(params);
  }, [searchParams]);

  // Column visibility.
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
      // S.No + Actions stay on regardless of what was saved.
      const always = COLUMNS.filter((c) => !c.togglable).map((c) => c.key);
      const merged = new Set<CaseColumnKey>([...always, ...valid]);
      setVisibleColumns(
        COLUMNS.filter((c) => merged.has(c.key)).map((c) => c.key)
      );
    } catch {
      /* Corrupt localStorage entry — defaults stand. */
    }
  }, [visibilityKey]);

  const persistVisibility = useCallback(
    (next: CaseColumnKey[]) => {
      setVisibleColumns(next);
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(visibilityKey, JSON.stringify(next));
      } catch {
        /* localStorage disabled — accept ephemeral state. */
      }
    },
    [visibilityKey]
  );

  // Fetched rows + meta + loading state.
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const requestRef = useRef(0);

  // Delete-request flow state. When non-admin clicks Delete on a row,
  // we open RequestDeleteDialog instead of disposing directly. After
  // the user submits a request, a small confirmation banner takes the
  // place of the dialog until the next refetch.
  const [requestTarget, setRequestTarget] = useState<RequestTarget | null>(
    null
  );
  const [requestSentFor, setRequestSentFor] = useState<{
    caseNo: string;
  } | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const seq = ++requestRef.current;
    try {
      const params = filtersToQuery(appliedFilters);
      params.set("limit", String(appliedFilters.limit));
      const res = await fetch(`/api/app/cases?${params.toString()}`, {
        cache: "no-store",
      });
      if (seq !== requestRef.current) return;
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

  const handleApply = useCallback(
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

  const handleDelete = useCallback(
    async (row: CaseRow) => {
      // Non-admin path — open the request dialog instead of disposing.
      if (!bootstrap.isAdmin) {
        setRequestTarget({
          type: "case",
          id: row.id,
          name: row.caseNo || row.fileNo || "this matter",
          hint: "Only the office admin can dispose a matter directly.",
        });
        return;
      }

      // Admin path — direct dispose via PATCH.
      const confirmMsg = `Move ${row.caseNo || "this matter"} to Disposed Cases? You can reopen it later from the archive.`;
      if (typeof window !== "undefined" && !window.confirm(confirmMsg)) {
        return;
      }
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
          // Server might still 403 us — even admins occasionally get a
          // delete_request_required signal if their role record is
          // stale. Surface the message and restore the row.
          setError(
            data?.error ||
              "Couldn't move that matter to Disposed. Try again."
          );
          setHidden((prev) => {
            const next = new Set(prev);
            next.delete(row.id);
            return next;
          });
          return;
        }
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
    [bootstrap.isAdmin, fetchRows]
  );

  const visibleRows = useMemo(
    () => rows.filter((r) => !hidden.has(r.id)),
    [rows, hidden]
  );

  return (
    <div className="mt-7 space-y-5">
      <CaseToolBar
        bootstrap={bootstrap}
        appliedFilters={appliedFilters}
        visibleColumns={visibleColumns}
        onApply={handleApply}
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

      {requestSentFor ? (
        <div
          className="rounded-md px-4 py-3 text-[13px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: "var(--color-app-aqua-soft)",
            border: "1px solid var(--color-app-aqua)",
            color: "var(--color-app-ink)",
          }}
        >
          Delete request for{" "}
          <span style={{ fontWeight: 600 }}>{requestSentFor.caseNo}</span>{" "}
          sent. The office admin will review it shortly.
        </div>
      ) : null}

      <CaseTable
        rows={visibleRows}
        total={total}
        loading={loading}
        visibleColumns={visibleColumns}
        appliedFilters={appliedFilters}
        onDelete={handleDelete}
      />

      {requestTarget ? (
        <RequestDeleteDialog
          target={requestTarget}
          onClose={() => setRequestTarget(null)}
          onSubmitted={() => {
            const name = requestTarget.name;
            setRequestTarget(null);
            setRequestSentFor({ caseNo: name });
            // Banner sticks until the next page interaction.
            setTimeout(() => setRequestSentFor(null), 8000);
          }}
        />
      ) : null}
    </div>
  );
}
