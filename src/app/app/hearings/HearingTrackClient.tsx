"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  filterHearingRows,
  type HearingRow,
  type Bucket,
} from "@/lib/hearing-row";
import {
  buildWhatsAppLink as buildNoticeLink,
  parseDateInputLocal,
} from "@/lib/whatsapp";
import CnrLink from "@/app/app/components/CnrLink";
import WhatsAppIcon from "@/app/app/components/WhatsAppIcon";
import StatusCombobox from "@/app/app/cases/StatusCombobox";

export type { HearingRow, Bucket };

type Counts = { today: number; tomorrow: number; pending: number; all: number };

export default function HearingTrackClient({
  bucket,
  items,
  counts,
  officeName,
  noticeTemplate,
  isAdmin,
}: {
  bucket: Bucket;
  items: HearingRow[];
  counts: Counts;
  officeName: string;
  noticeTemplate: string;
  isAdmin: boolean;
}) {
  // Search filters the loaded bucket client-side — instant, and it carries
  // across tab switches (the component isn't remounted on navigation) so a
  // query you typed on Today still narrows Pending.
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => filterHearingRows(items, query),
    [items, query]
  );

  // The "All" bucket is capped server-side; tell the user when they're
  // looking at a slice so the count never silently lies.
  const truncated = bucket === "all" && counts.all > items.length;

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            className="text-[30px] font-semibold tracking-tight leading-[1.1] sm:text-[40px]"
            style={{
              fontFamily: "var(--font-crimson), Georgia, serif",
              color: "var(--color-app-ink)",
            }}
          >
            Hearing Track
          </h2>
          <p
            className="mt-2 text-[13px]"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-muted)",
            }}
          >
            Date-wise, pending, and the full register.
          </p>
        </div>
        {isAdmin ? (
          <HearingExportMenu bucket={bucket} query={query} />
        ) : null}
      </div>

      {/* Tab strip + search */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs bucket={bucket} counts={counts} />
        <HearingSearch value={query} onChange={setQuery} />
      </div>

      {/* Slice note for the capped All bucket */}
      {truncated ? (
        <p
          className="mt-4 text-[12px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Showing the {items.length.toLocaleString("en-IN")} soonest of{" "}
          <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>
            {counts.all.toLocaleString("en-IN")}
          </span>{" "}
          active matters. Narrow with search, or browse the full register in{" "}
          <Link
            href="/app/cases"
            className="underline"
            style={{ color: "var(--color-app-copper-deep)" }}
          >
            Case Vault
          </Link>
          .
        </p>
      ) : null}

      {/* Result count while searching */}
      {query.trim() ? (
        <p
          className="mt-4 text-[12px]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          {filtered.length} of {items.length} matching “{query.trim()}”
        </p>
      ) : null}

      {/* List */}
      <div className="mt-6">
        {filtered.length === 0 ? (
          query.trim() ? (
            <NoMatches query={query.trim()} onClear={() => setQuery("")} />
          ) : (
            <EmptyState bucket={bucket} />
          )
        ) : bucket === "pending" ? (
          <div className="space-y-4">
            {filtered.map((c, i) => (
              <PendingCard
                key={c.id}
                c={c}
                index={i}
                officeName={officeName}
                noticeTemplate={noticeTemplate}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c, i) => (
              <ScheduledRow
                key={c.id}
                c={c}
                index={i}
                officeName={officeName}
                noticeTemplate={noticeTemplate}
                showDate={bucket === "all"}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Tabs ─── */

function Tabs({ bucket, counts }: { bucket: Bucket; counts: Counts }) {
  const tabs: { key: Bucket; label: string; count: number }[] = [
    { key: "today", label: "Today", count: counts.today },
    { key: "tomorrow", label: "Tomorrow", count: counts.tomorrow },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "all", label: "All Cases", count: counts.all },
  ];

  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl p-1"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
      }}
    >
      {tabs.map((t) => {
        const active = t.key === bucket;
        return (
          <Link
            key={t.key}
            href={`/app/hearings?tab=${t.key}`}
            scroll={false}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-[14px] transition-all sm:px-5"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              backgroundColor: active
                ? "var(--color-app-canvas-2)"
                : "transparent",
              color: active
                ? "var(--color-app-ink)"
                : "var(--color-app-fg-muted)",
              fontWeight: active ? 600 : 500,
              borderBottom: active
                ? "2px solid var(--color-app-copper)"
                : "2px solid transparent",
            }}
          >
            {t.label}
            {t.count > 0 ? (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] tabular-nums"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  backgroundColor: active
                    ? "var(--color-app-copper)"
                    : "var(--color-app-edge)",
                  color: active
                    ? "var(--color-app-copper-text)"
                    : "var(--color-app-fg-muted)",
                  fontWeight: 600,
                  letterSpacing: 0,
                }}
              >
                {t.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

/* ─── Search ─── */

function HearingSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative" style={{ minWidth: 260 }}>
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: "var(--color-app-fg-muted)" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle
            cx="11"
            cy="11"
            r="6.5"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M16 16l5 5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search case, client, CNR, court…"
        className="w-full rounded-lg border py-2.5 pl-9 pr-9 text-[13px] outline-none transition-colors"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          borderColor: "var(--color-app-edge)",
          backgroundColor: "var(--color-app-paper)",
          color: "var(--color-app-ink)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-app-copper)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(197,133,58,0.15)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--color-app-edge)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
          style={{
            backgroundColor: "var(--color-app-canvas-2)",
            color: "var(--color-app-fg-muted)",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

/* ─── Export menu (admin) ─── */

function HearingExportMenu({
  bucket,
  query,
}: {
  bucket: Bucket;
  query: string;
}) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState<"xlsx" | "docx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function trigger(format: "xlsx" | "docx" | "pdf") {
    setError(null);
    setWorking(format);
    try {
      const params = new URLSearchParams({ bucket, format });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/app/hearings/export?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Couldn't generate that export.");
        setWorking(null);
        return;
      }
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = (match && match[1]) || `hearing-track.${format}`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setWorking(null);
    }
  }

  const LABELS: Record<"xlsx" | "docx" | "pdf", string> = {
    xlsx: "Excel (.xlsx)",
    docx: "Word (.docx)",
    pdf: "PDF",
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={Boolean(working)}
        className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] transition-all hover:-translate-y-0.5"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          backgroundColor: "var(--color-app-ink)",
          color: "var(--color-app-ivory)",
          boxShadow: "0 8px 18px -10px rgba(10,17,36,0.45)",
          opacity: working ? 0.7 : 1,
        }}
      >
        {working ? (
          <>
            <span
              className="inline-block h-3 w-3 animate-spin rounded-full"
              style={{
                borderWidth: 1.5,
                borderStyle: "solid",
                borderColor: "rgba(245,235,214,0.35)",
                borderTopColor: "var(--color-app-copper)",
              }}
            />
            Generating…
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 4v12m-5-5l5 5 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 18v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export
            <span aria-hidden className="ml-0.5 text-[10px]" style={{ opacity: 0.75 }}>
              ▾
            </span>
          </>
        )}
      </button>

      {open && !working ? (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute left-0 z-30 mt-2 w-[230px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md sm:left-auto sm:right-0"
            style={{
              backgroundColor: "var(--color-app-paper)",
              border: "1px solid var(--color-app-edge)",
              boxShadow:
                "0 16px 32px -12px rgba(10,17,36,0.25), 0 0 0 1px rgba(10,17,36,0.04)",
            }}
          >
            <div
              className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                color: "var(--color-app-fg-muted)",
                borderBottom: "1px solid var(--color-app-edge-soft)",
                backgroundColor: "var(--color-app-canvas-2)",
              }}
            >
              Download this view
            </div>
            <ul className="py-1">
              {(["xlsx", "docx", "pdf"] as const).map((f) => (
                <li key={f}>
                  <button
                    type="button"
                    onClick={() => trigger(f)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] font-semibold transition-colors"
                    style={{
                      fontFamily: "var(--font-manrope), sans-serif",
                      color: "var(--color-app-ink)",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--color-app-canvas-2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <FormatBadge format={f} />
                    {LABELS[f]}
                  </button>
                </li>
              ))}
            </ul>
            {error ? (
              <div
                className="px-3 py-2 text-[11px]"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  backgroundColor: "var(--color-app-danger-soft)",
                  color: "var(--color-app-danger)",
                  borderTop: "1px solid var(--color-app-edge-soft)",
                }}
              >
                {error}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function FormatBadge({ format }: { format: "xlsx" | "docx" | "pdf" }) {
  const palette: Record<string, { bg: string; fg: string }> = {
    xlsx: { bg: "#1f6f43", fg: "#ffffff" },
    docx: { bg: "#2b5797", fg: "#ffffff" },
    pdf: { bg: "#9a2c2c", fg: "#ffffff" },
  };
  const p = palette[format];
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[9px] font-semibold uppercase tracking-[0.14em]"
      style={{
        fontFamily: "var(--font-dm-mono), monospace",
        backgroundColor: p.bg,
        color: p.fg,
      }}
    >
      {format}
    </span>
  );
}

/* ─── Today/Tomorrow/All row ─── */

function ScheduledRow({
  c,
  index,
  officeName,
  noticeTemplate,
  showDate,
}: {
  c: HearingRow;
  index: number;
  officeName: string;
  noticeTemplate: string;
  showDate: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const courtLine = [c.courtName, c.courtPlace].filter(Boolean).join(", ");
  const telLink = buildTelLink(c);
  const waLink = rowWaLink(c, noticeTemplate, officeName);

  return (
    <div
      className="fade-up-sm rounded-xl transition-[box-shadow,transform] duration-200 ease-out"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        borderLeft: "3px solid var(--color-app-copper)",
        animationDelay: `${Math.min(index, 10) * 35}ms`,
      }}
    >
      <div className="group flex items-center gap-5 p-5">
        <div className="min-w-0 flex-1">
          <Link
            href={`/app/cases/${c.id}`}
            style={{ display: "block" }}
          >
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
              {showDate ? <NextDateChip iso={c.nextHearingDate} /> : null}
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
            {(c.clientName || courtLine) && (
              <div
                className="mt-1.5 text-[13px]"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  color: "var(--color-app-fg-soft)",
                }}
              >
                {c.clientName ? (
                  <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>
                    {c.clientName}
                  </span>
                ) : null}
                {c.clientName && courtLine ? (
                  <span style={{ color: "var(--color-app-copper-deep)" }}> · </span>
                ) : null}
                {courtLine ? (
                  <span style={{ color: "var(--color-app-fg-muted)" }}>
                    {courtLine}
                  </span>
                ) : null}
              </div>
            )}
          </Link>
          {c.cnr ? (
            <div
              className="mt-1.5 text-[13px]"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-fg-muted)",
              }}
            >
              CNR <CnrLink cnr={c.cnr} />
            </div>
          ) : null}
        </div>

        {/* Action cluster */}
        <div className="flex shrink-0 items-center gap-2">
          <ContactIconButton
            href={telLink}
            icon={<PhoneIcon />}
            ariaLabel={`Call ${c.clientName || "client"}`}
            variant="ink-ghost"
          />
          <ContactIconButton
            href={waLink}
            icon={<WhatsAppIcon />}
            ariaLabel={`WhatsApp ${c.clientName || "client"}`}
            variant="whatsapp"
            newTab
          />
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[12px] font-semibold transition-all hover:-translate-y-0.5"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              backgroundColor: editing
                ? "var(--color-app-ink)"
                : "var(--color-app-copper)",
              color: editing
                ? "var(--color-app-ivory)"
                : "var(--color-app-copper-text)",
              boxShadow: editing
                ? "none"
                : "0 6px 16px -10px rgba(197,133,58,0.6)",
            }}
          >
            <CalendarIcon />
            {editing ? "Close" : "Update"}
          </button>
        </div>
      </div>

      {editing ? (
        <InlineHearingUpdate
          row={c}
          officeName={officeName}
          noticeTemplate={noticeTemplate}
          onClose={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

/* ─── Pending card ─── */

function PendingCard({
  c,
  index,
  officeName,
  noticeTemplate,
}: {
  c: HearingRow;
  index: number;
  officeName: string;
  noticeTemplate: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const telLink = buildTelLink(c);
  const waLink = rowWaLink(c, noticeTemplate, officeName);

  // Two flavours of pending — the previous date passed without being
  // replaced (overdue) or the matter was never given a next date
  // (undated). The badge + tagline change accordingly.
  const overdueDays = overdueDaysFor(c.nextHearingDate);
  const isOverdue = overdueDays !== null;

  return (
    <div
      className="fade-up-sm rounded-xl"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        borderLeft: isOverdue
          ? "3px solid var(--color-app-danger)"
          : "3px solid var(--color-app-copper)",
        animationDelay: `${Math.min(index, 10) * 35}ms`,
      }}
    >
      <div className="p-6">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/app/cases/${c.id}`}
              className="text-[24px] font-semibold tracking-tight transition-colors hover:opacity-70"
              style={{
                fontFamily: "var(--font-crimson), Georgia, serif",
                color: "var(--color-app-ink)",
                display: "inline-block",
              }}
            >
              {c.caseNo}
            </Link>
            {c.status ? (
              <span
                className="ml-3 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  backgroundColor: "var(--color-app-aqua-soft)",
                  color: "var(--color-app-aqua)",
                  verticalAlign: "middle",
                }}
              >
                {c.status}
              </span>
            ) : null}
            <div
              className="mt-1.5 text-[13px]"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-fg-soft)",
              }}
            >
              {c.clientName ? (
                <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>
                  {c.clientName}
                </span>
              ) : (
                <span style={{ color: "var(--color-app-fg-muted)" }}>—</span>
              )}
              {c.cnr ? (
                <>
                  <span style={{ color: "var(--color-app-copper-deep)" }}> · </span>
                  <span style={{ color: "var(--color-app-fg-muted)" }}>
                    CNR <CnrLink cnr={c.cnr} />
                  </span>
                </>
              ) : null}
            </div>
            {!isOverdue && c.lastHearingDate ? (
              <div
                className="mt-1 text-[12px]"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: "var(--color-app-fg-muted)",
                }}
              >
                Last date:{" "}
                <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>
                  {c.lastHearingDate.slice(0, 10)}
                </span>
              </div>
            ) : null}
          </div>

          {/* Badge column */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {isOverdue ? (
              <>
                <span
                  className="rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{
                    fontFamily: "var(--font-dm-mono), monospace",
                    backgroundColor: "var(--color-app-danger-soft)",
                    color: "var(--color-app-danger)",
                  }}
                >
                  {formatOverdue(overdueDays)}
                </span>
                <span
                  className="text-[11px]"
                  style={{
                    fontFamily: "var(--font-dm-mono), monospace",
                    color: "var(--color-app-fg-muted)",
                  }}
                >
                  Was{" "}
                  <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>
                    {(c.nextHearingDate || "").slice(0, 10)}
                  </span>
                </span>
              </>
            ) : (
              <span
                className="rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  backgroundColor: "var(--color-app-copper)",
                  color: "var(--color-app-copper-text)",
                }}
              >
                No next date
              </span>
            )}
          </div>
        </div>

        {/* Action row — Update hearing (inline), Call, WhatsApp. The Update
            button opens the editor right here so the advocate can set the
            next date and message the client without leaving the page. */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md px-5 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              backgroundColor: editing
                ? "var(--color-app-ink)"
                : "var(--color-app-copper)",
              color: editing
                ? "var(--color-app-ivory)"
                : "var(--color-app-copper-text)",
              boxShadow: editing
                ? "none"
                : "0 8px 20px -10px rgba(197,133,58,0.6)",
            }}
          >
            <CalendarIcon />
            {editing ? "Close" : "Update hearing"}
          </button>
          <ContactPillButton
            href={telLink}
            icon={<PhoneIcon />}
            label="Call"
            variant="ghost"
          />
          <ContactPillButton
            href={waLink}
            icon={<WhatsAppIcon />}
            label="WhatsApp"
            variant="whatsapp"
            newTab
          />
        </div>
      </div>

      {editing ? (
        <InlineHearingUpdate
          row={c}
          officeName={officeName}
          noticeTemplate={noticeTemplate}
          onClose={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

/* ─── Inline hearing update ─── */

// The compact editor that drops into a card. It PATCHes the case exactly
// like the full Update-Hearing form on the case page, then surfaces Call /
// WhatsApp for the just-saved date right here. Closing the editor refreshes
// the list so the row re-buckets (a freshly-dated matter leaves Pending).
function InlineHearingUpdate({
  row,
  officeName,
  noticeTemplate,
  onClose,
}: {
  row: HearingRow;
  officeName: string;
  noticeTemplate: string;
  onClose: () => void;
}) {
  const [nextDate, setNextDate] = useState(
    row.nextHearingDate ? row.nextHearingDate.slice(0, 10) : ""
  );
  const [status, setStatus] = useState(row.status || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedDate, setSavedDate] = useState("");

  const dirty =
    nextDate !== (row.nextHearingDate ? row.nextHearingDate.slice(0, 10) : "") ||
    status !== (row.status || "");

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/app/cases/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextHearingDate: nextDate || null, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Couldn't update");
        setSaving(false);
        return;
      }
      setSavedDate(nextDate);
      setSaved(true);
      setSaving(false);
    } catch {
      setError("Network error.");
      setSaving(false);
    }
  }

  // Notify links built from the SAVED date so the message quotes what's on
  // record, not a half-typed edit.
  const savedIso = saved
    ? parseDateInputLocal(savedDate)?.toISOString() ?? null
    : null;
  // For the notice: the hearing just held was on the date we updated *from*
  // (the previous date), and the new posting is what we saved. Undated rows
  // fall back to the matter's archived last hearing date.
  const notifyRow: HearingRow = {
    ...row,
    lastHearingDate: row.nextHearingDate || row.lastHearingDate,
    nextHearingDate: savedIso,
  };
  const telLink = buildTelLink(notifyRow);
  const waLink = rowWaLink(notifyRow, noticeTemplate, officeName);
  const hasContact = Boolean(telLink || waLink);
  const showNotify = saved && !dirty;

  return (
    <div
      className="border-t px-6 py-5"
      style={{
        borderColor: "var(--color-app-edge-soft)",
        backgroundColor: "var(--color-app-canvas-2)",
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-fg-muted)",
            }}
          >
            Next hearing date
          </label>
          <input
            type="date"
            value={nextDate}
            onChange={(e) => {
              setNextDate(e.target.value);
              setSaved(false);
            }}
            className="mt-2 block w-full rounded-md border px-3 py-2 text-[13px] outline-none transition-colors"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              borderColor: "var(--color-app-edge)",
              backgroundColor: "var(--color-app-paper)",
              color: "var(--color-app-ink)",
            }}
          />
          <p
            className="mt-1.5 text-[11px]"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-muted)",
            }}
          >
            Leave blank to keep it pending.
          </p>
        </div>
        <div>
          <StatusCombobox
            id={`pending-status-${row.id}`}
            label="Status / Stage"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setSaved(false);
            }}
            placeholder="Filed, Evidence, Arguments…"
          />
          <p
            className="mt-1.5 text-[11px]"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-muted)",
            }}
          >
            Type{" "}
            <span style={{ fontWeight: 600, color: "var(--color-app-ink)" }}>
              Disposed
            </span>{" "}
            to archive this matter.
          </p>
        </div>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-md px-4 py-3 text-[13px]"
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

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="text-[12px] font-semibold uppercase tracking-[0.16em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          {saved ? "Done" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[13px] font-semibold transition-all"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: dirty
              ? "var(--color-app-copper)"
              : "var(--color-app-paper)",
            color: dirty
              ? "var(--color-app-copper-text)"
              : "var(--color-app-fg-muted)",
            opacity: saving ? 0.6 : 1,
            cursor: dirty && !saving ? "pointer" : "default",
            boxShadow: dirty ? "0 8px 20px -10px rgba(197,133,58,0.6)" : "none",
          }}
        >
          {saving ? "Saving…" : saved && !dirty ? "Saved" : "Save Update"}
        </button>
      </div>

      {showNotify ? (
        <div
          className="mt-5 rounded-lg p-4"
          style={{
            backgroundColor: "var(--color-app-paper)",
            border: "1px solid var(--color-app-edge)",
          }}
        >
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-copper-deep)",
            }}
          >
            Hearing saved — notify {row.clientName || "the client"}
          </div>
          {hasContact ? (
            <div className="mt-3 flex flex-wrap gap-3">
              {telLink ? (
                <a
                  href={telLink}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                  style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    backgroundColor: "var(--color-app-ink)",
                    color: "var(--color-app-ivory)",
                    boxShadow: "0 8px 20px -10px rgba(10,17,36,0.4)",
                    minWidth: 130,
                  }}
                >
                  <PhoneIcon />
                  Call
                </a>
              ) : null}
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                  style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    backgroundColor: "#25d366",
                    color: "#0b3d22",
                    boxShadow: "0 8px 20px -10px rgba(37,211,102,0.5)",
                    minWidth: 130,
                  }}
                >
                  <WhatsAppIcon />
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : (
            <p
              className="mt-2 text-[12px]"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-fg-muted)",
              }}
            >
              No phone or WhatsApp on file for this client.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Next-date chip (All tab) ─── */

function NextDateChip({ iso }: { iso: string | null }) {
  if (!iso) {
    return (
      <Chip bg="var(--color-app-edge)" fg="var(--color-app-fg-muted)">
        No date
      </Chip>
    );
  }
  const overdue = overdueDaysFor(iso);
  const dateStr = formatDateShort(iso);
  if (overdue) {
    return (
      <Chip bg="var(--color-app-danger-soft)" fg="var(--color-app-danger)">
        Overdue · {dateStr}
      </Chip>
    );
  }
  return (
    <Chip bg="var(--color-app-copper)" fg="var(--color-app-copper-text)">
      {dateStr}
    </Chip>
  );
}

function Chip({
  bg,
  fg,
  children,
}: {
  bg: string;
  fg: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={{
        fontFamily: "var(--font-dm-mono), monospace",
        backgroundColor: bg,
        color: fg,
      }}
    >
      {children}
    </span>
  );
}

/* ─── Contact buttons ─── */

function ContactIconButton({
  href,
  icon,
  ariaLabel,
  variant,
  newTab,
}: {
  href: string | null;
  icon: React.ReactNode;
  ariaLabel: string;
  variant: "ink-ghost" | "whatsapp";
  newTab?: boolean;
}) {
  const enabled =
    variant === "whatsapp"
      ? {
          backgroundColor: "#1faa4f",
          color: "#ffffff",
          shadow: "0 6px 18px -8px rgba(31,170,79,0.55)",
        }
      : {
          backgroundColor: "var(--color-app-ink)",
          color: "var(--color-app-ivory)",
          shadow: "0 6px 18px -10px rgba(10,17,36,0.45)",
        };

  const disabled =
    variant === "whatsapp"
      ? { backgroundColor: "#9bbfa8", color: "#ffffff" }
      : {
          backgroundColor: "var(--color-app-fg-muted)",
          color: "var(--color-app-ivory)",
        };

  if (!href) {
    return (
      <button
        aria-label={`${ariaLabel} (no number on file)`}
        title={`${ariaLabel} — no number on file. Add it on the case or in Client Crew.`}
        disabled
        className="inline-flex h-10 w-10 items-center justify-center rounded-full"
        style={{
          backgroundColor: disabled.backgroundColor,
          color: disabled.color,
          cursor: "not-allowed",
        }}
      >
        {icon}
      </button>
    );
  }

  return (
    <a
      aria-label={ariaLabel}
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-all hover:-translate-y-0.5 hover:scale-105"
      style={{
        backgroundColor: enabled.backgroundColor,
        color: enabled.color,
        boxShadow: enabled.shadow,
      }}
    >
      {icon}
    </a>
  );
}

function ContactPillButton({
  href,
  icon,
  label,
  variant,
  newTab,
}: {
  href: string | null;
  icon: React.ReactNode;
  label: string;
  variant: "ghost" | "whatsapp";
  newTab?: boolean;
}) {
  const styles =
    variant === "whatsapp"
      ? {
          backgroundColor: "#1faa4f",
          color: "#ffffff",
          border: "1px solid transparent",
          boxShadow: "0 6px 16px -10px rgba(31,170,79,0.55)",
        }
      : {
          backgroundColor: "var(--color-app-paper)",
          color: "var(--color-app-ink)",
          border: "1px solid var(--color-app-edge)",
          boxShadow: "none" as const,
        };

  if (!href) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[12px] font-semibold opacity-40"
        style={{ ...styles, fontFamily: "var(--font-manrope), sans-serif" }}
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <a
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
      className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[12px] font-semibold transition-all hover:-translate-y-0.5"
      style={{ ...styles, fontFamily: "var(--font-manrope), sans-serif" }}
    >
      {icon}
      {label}
    </a>
  );
}

/* ─── Empty states ─── */

function EmptyState({ bucket }: { bucket: Bucket }) {
  const copy =
    bucket === "today"
      ? {
          title: "Nothing on the cause-list today.",
          body: "When a matter has its next hearing date set to today, it will surface here for quick triage.",
        }
      : bucket === "tomorrow"
        ? {
            title: "Tomorrow looks clear.",
            body: "No matters are listed for tomorrow yet — a quiet day to plan ahead.",
          }
        : bucket === "all"
          ? {
              title: "No active matters yet.",
              body: "Every case you add to the vault shows up here with its next hearing date, ready to update.",
            }
          : {
              title: "No pending dates. Inbox zero.",
              body: "Every matter in the vault has its next hearing date set, and no past hearings are sitting un-updated. Matters land here when a hearing date is missing or has passed without being re-listed.",
            };

  return (
    <div
      className="rounded-xl px-5 py-14 text-center"
      style={{
        backgroundColor: "var(--color-app-paper)",
        border: "1px dashed var(--color-app-edge)",
      }}
    >
      <h3
        className="text-[22px] font-semibold tracking-tight"
        style={{
          fontFamily: "var(--font-crimson), Georgia, serif",
          color: "var(--color-app-ink)",
        }}
      >
        {copy.title}
      </h3>
      <p
        className="mx-auto mt-2 max-w-md text-[13px] leading-7"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-fg-muted)",
        }}
      >
        {copy.body}
      </p>
    </div>
  );
}

function NoMatches({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <div
      className="rounded-xl px-5 py-12 text-center"
      style={{
        backgroundColor: "var(--color-app-paper)",
        border: "1px dashed var(--color-app-edge)",
      }}
    >
      <h3
        className="text-[20px] font-semibold tracking-tight"
        style={{
          fontFamily: "var(--font-crimson), Georgia, serif",
          color: "var(--color-app-ink)",
        }}
      >
        No matter matches “{query}”.
      </h3>
      <p
        className="mx-auto mt-2 max-w-md text-[13px] leading-7"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-fg-muted)",
        }}
      >
        Try a case number, client name, CNR, or court — or switch tabs. The
        search looks within this tab&rsquo;s list.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[12px] font-semibold"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          backgroundColor: "var(--color-app-canvas-2)",
          color: "var(--color-app-ink)",
        }}
      >
        Clear search
      </button>
    </div>
  );
}

/* ─── Helpers ─── */

function buildTelLink(c: HearingRow): string | null {
  const target = (c.clientPhone || c.clientWhatsapp || "").replace(/\s+/g, "");
  if (!target) return null;
  return `tel:${target}`;
}

// Builds the WhatsApp notice for a hearing row from the office's editable
// template (the bilingual notice with {{caseNo}} / {{nextHearingDate}} etc.),
// filling the merge fields from the row.
function rowWaLink(
  c: HearingRow,
  template: string,
  officeName: string
): string | null {
  return buildNoticeLink(c.clientWhatsapp || c.clientPhone || "", template, {
    caseNo: c.caseNo || "",
    clientName: c.clientName || "",
    cnr: c.cnr || "",
    fileNo: c.fileNo || "",
    status: c.status || "",
    oppositeParty: c.oppositeParty || "",
    courtName: c.courtName || "",
    courtPlace: c.courtPlace || "",
    lastHearingDate: c.lastHearingDate ? new Date(c.lastHearingDate) : null,
    nextHearingDate: c.nextHearingDate ? new Date(c.nextHearingDate) : null,
    officeName: officeName || "",
  });
}

function overdueDaysFor(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date();
  const tDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.floor(
    (tDay.getTime() - dDay.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff > 0 ? diff : null;
}

function formatOverdue(days: number | null): string {
  if (days === null || days <= 0) return "Overdue";
  if (days === 1) return "Overdue · yesterday";
  if (days < 7) return `Overdue · ${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Overdue · ${weeks}w`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `Overdue · ${months}mo`;
  }
  const years = Math.floor(days / 365);
  return `Overdue · ${years}y`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ─── Icons ─── */

function CalendarIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3 10h18M8 3v4M16 3v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M9 14h2v2H9z" fill="currentColor" />
    </svg>
  );
}

function PhoneIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// WhatsAppIcon now imported from the shared components module.
