"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// "Import Cases" — sits beside "+ New Case". Upload a Word / Excel / CSV /
// PDF roll → the server parses it → the user reviews the parsed rows in a
// preview table (deselecting any they don't want, with bad rows flagged) →
// confirm → bulk create. Nothing is written until the user hits Import.

type ParsedRow = {
  caseNo: string;
  fileNo: string;
  cnr: string;
  iaNumbers: string;
  clientName: string;
  appearingFor: string;
  courtName: string;
  clientPhone: string;
  clientWhatsapp: string;
  status: string;
  lastHearingDate: string | null;
  nextHearingDate: string | null;
};
type RowIssue = { missingCaseNo: boolean; duplicateCnr: boolean; note: string };

const ACCEPT = ".docx,.xlsx,.xls,.csv,.pdf";

type Stage = "idle" | "parsing" | "preview" | "importing" | "done";

export default function ImportCasesButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md px-4 py-3 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          backgroundColor: "var(--color-app-paper)",
          color: "var(--color-app-ink)",
          border: "1px solid var(--color-app-edge)",
          boxShadow: "0 1px 0 var(--color-app-edge)",
        }}
      >
        <ImportIcon />
        Import Cases
      </button>
      {open ? <ImportModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [issues, setIssues] = useState<RowIssue[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [summary, setSummary] = useState<{
    created: number;
    skipped: { caseNo: string; reason: string }[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    setStage("parsing");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/app/cases/import/parse", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Couldn't read that file.");
        setStage("idle");
        return;
      }
      const parsedRows: ParsedRow[] = data.rows || [];
      const parsedIssues: RowIssue[] = data.issues || [];
      if (parsedRows.length === 0) {
        setError("No cases were found in that file.");
        setStage("idle");
        return;
      }
      setRows(parsedRows);
      setIssues(parsedIssues);
      setWarnings(data.warnings || []);
      // Pre-select everything importable (a row with a case number).
      setSelected(parsedRows.map((_, i) => !parsedIssues[i]?.missingCaseNo));
      setStage("preview");
    } catch {
      setError("Network error while reading the file.");
      setStage("idle");
    }
  }

  async function doImport() {
    const toImport = rows.filter((_, i) => selected[i]);
    if (toImport.length === 0) return;
    setStage("importing");
    setError(null);
    try {
      const res = await fetch("/api/app/cases/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: toImport }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Import failed.");
        setStage("preview");
        return;
      }
      setSummary({ created: data.created || 0, skipped: data.skipped || [] });
      setStage("done");
      router.refresh();
    } catch {
      setError("Network error during import.");
      setStage("preview");
    }
  }

  const selectedCount = selected.filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(10,17,36,0.45)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[920px] flex-col overflow-hidden rounded-2xl"
        style={{
          backgroundColor: "var(--color-app-paper)",
          boxShadow: "0 32px 64px -24px rgba(10,17,36,0.5)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-4 px-6 py-4"
          style={{ borderBottom: "1px solid var(--color-app-edge)" }}
        >
          <div>
            <h3
              className="text-[20px] font-semibold tracking-tight"
              style={{
                fontFamily: "var(--font-crimson), Georgia, serif",
                color: "var(--color-app-ink)",
              }}
            >
              Import cases
            </h3>
            <p
              className="mt-0.5 text-[12px]"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-fg-muted)",
              }}
            >
              Upload a Word, Excel, CSV or PDF roll — review, then import.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ color: "var(--color-app-fg-muted)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <div
              className="mb-4 rounded-md px-3 py-2 text-[12.5px]"
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

          {stage === "idle" || stage === "parsing" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              onClick={() => stage !== "parsing" && inputRef.current?.click()}
              className="cursor-pointer rounded-xl px-6 py-14 text-center transition-colors"
              style={{
                border: `1.5px dashed ${dragOver ? "var(--color-app-copper)" : "var(--color-app-edge)"}`,
                backgroundColor: dragOver ? "var(--color-app-canvas-2)" : "transparent",
              }}
            >
              {stage === "parsing" ? (
                <p
                  className="text-[14px] font-semibold"
                  style={{ fontFamily: "var(--font-manrope), sans-serif", color: "var(--color-app-ink)" }}
                >
                  Reading {fileName}…
                </p>
              ) : (
                <>
                  <p
                    className="text-[14px]"
                    style={{ fontFamily: "var(--font-manrope), sans-serif", color: "var(--color-app-fg-soft)" }}
                  >
                    <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>Drag a file here</span> or click to browse
                  </p>
                  <p
                    className="mt-1 text-[10.5px] uppercase tracking-[0.14em]"
                    style={{ fontFamily: "var(--font-dm-mono), monospace", color: "var(--color-app-fg-muted)" }}
                  >
                    Word · Excel · CSV · PDF
                  </p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          ) : null}

          {stage === "preview" || stage === "importing" ? (
            <PreviewTable
              rows={rows}
              issues={issues}
              warnings={warnings}
              selected={selected}
              onToggle={(i) =>
                setSelected((prev) => prev.map((v, j) => (j === i ? !v : v)))
              }
              onToggleAll={(v) =>
                setSelected(rows.map((_, i) => v && !issues[i]?.missingCaseNo))
              }
            />
          ) : null}

          {stage === "done" && summary ? (
            <DoneSummary summary={summary} />
          ) : null}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: "1px solid var(--color-app-edge)" }}
        >
          <span
            className="text-[12px]"
            style={{ fontFamily: "var(--font-dm-mono), monospace", color: "var(--color-app-fg-muted)" }}
          >
            {stage === "preview" || stage === "importing"
              ? `${selectedCount} of ${rows.length} selected`
              : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-[13px] font-semibold"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-fg-soft)",
                border: "1px solid var(--color-app-edge)",
              }}
            >
              {stage === "done" ? "Close" : "Cancel"}
            </button>
            {stage === "preview" || stage === "importing" ? (
              <button
                type="button"
                onClick={doImport}
                disabled={selectedCount === 0 || stage === "importing"}
                className="rounded-md px-5 py-2 text-[13px] font-semibold transition-all disabled:cursor-not-allowed"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  backgroundColor: "var(--color-app-copper)",
                  color: "var(--color-app-copper-text)",
                  opacity: selectedCount === 0 || stage === "importing" ? 0.5 : 1,
                }}
              >
                {stage === "importing"
                  ? "Importing…"
                  : `Import ${selectedCount} case${selectedCount === 1 ? "" : "s"}`}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewTable({
  rows,
  issues,
  warnings,
  selected,
  onToggle,
  onToggleAll,
}: {
  rows: ParsedRow[];
  issues: RowIssue[];
  warnings: string[];
  selected: boolean[];
  onToggle: (i: number) => void;
  onToggleAll: (v: boolean) => void;
}) {
  const allChecked = selected.length > 0 && selected.every(Boolean);
  return (
    <div>
      {warnings.length > 0 ? (
        <div
          className="mb-3 rounded-md px-3 py-2 text-[12px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: "var(--color-app-canvas-2)",
            border: "1px solid var(--color-app-edge)",
            color: "var(--color-app-fg-soft)",
          }}
        >
          {warnings.join(" ")}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--color-app-edge)" }}>
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr style={{ backgroundColor: "var(--color-app-canvas-2)" }}>
              <Th>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  aria-label="Select all"
                />
              </Th>
              <Th>Case No</Th>
              <Th>Client</Th>
              <Th>Court</Th>
              <Th>File No</Th>
              <Th>CNR</Th>
              <Th>Next Date</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const issue = issues[i];
              const bad = issue?.missingCaseNo;
              return (
                <tr
                  key={i}
                  style={{
                    borderTop: "1px solid var(--color-app-edge-soft)",
                    backgroundColor: bad
                      ? "var(--color-app-danger-soft)"
                      : issue?.duplicateCnr
                        ? "rgba(172,123,51,0.08)"
                        : "transparent",
                    fontFamily: "var(--font-manrope), sans-serif",
                    color: "var(--color-app-ink)",
                  }}
                >
                  <Td>
                    <input
                      type="checkbox"
                      checked={!!selected[i]}
                      disabled={bad}
                      onChange={() => onToggle(i)}
                      aria-label={`Include row ${i + 1}`}
                    />
                  </Td>
                  <Td>
                    <span style={{ fontWeight: 600 }}>{r.caseNo || "—"}</span>
                    {issue?.note ? (
                      <div
                        className="text-[10.5px]"
                        style={{ color: bad ? "var(--color-app-danger)" : "var(--color-app-copper-deep)" }}
                      >
                        {issue.note}
                      </div>
                    ) : null}
                  </Td>
                  <Td>{r.clientName || "—"}</Td>
                  <Td>{r.courtName || "—"}</Td>
                  <Td mono>{r.fileNo || "—"}</Td>
                  <Td mono>{r.cnr || "—"}</Td>
                  <Td mono>{r.nextHearingDate || "—"}</Td>
                  <Td>{r.status || "—"}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DoneSummary({
  summary,
}: {
  summary: { created: number; skipped: { caseNo: string; reason: string }[] };
}) {
  return (
    <div className="py-4">
      <div
        className="rounded-lg px-4 py-3 text-[14px] font-semibold"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          backgroundColor: "var(--color-app-success-soft)",
          color: "var(--color-app-ink)",
          border: "1px solid var(--color-app-success)",
        }}
      >
        Imported {summary.created} case{summary.created === 1 ? "" : "s"}.
      </div>
      {summary.skipped.length > 0 ? (
        <div className="mt-3">
          <div
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ fontFamily: "var(--font-dm-mono), monospace", color: "var(--color-app-fg-muted)" }}
          >
            Skipped ({summary.skipped.length})
          </div>
          <ul className="mt-2 space-y-1">
            {summary.skipped.map((s, i) => (
              <li
                key={i}
                className="text-[12.5px]"
                style={{ fontFamily: "var(--font-manrope), sans-serif", color: "var(--color-app-fg-soft)" }}
              >
                <span style={{ fontWeight: 600, color: "var(--color-app-ink)" }}>{s.caseNo}</span> — {s.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.16em]"
      style={{
        fontFamily: "var(--font-dm-mono), monospace",
        color: "var(--color-app-copper-deep)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td
      className="px-3 py-2 align-top"
      style={{
        fontFamily: mono ? "var(--font-dm-mono), monospace" : undefined,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

function ImportIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15V4m0 0L8 8m4-4l4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
