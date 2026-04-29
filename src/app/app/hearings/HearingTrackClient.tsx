"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type Bucket = "today" | "tomorrow" | "pending";

export type HearingRow = {
  id: string;
  caseNo: string;
  fileNo: string;
  cnr: string;
  clientName: string;
  clientPhone: string;
  clientWhatsapp: string;
  oppositeParty: string;
  courtName: string;
  courtPlace: string;
  status: string;
  nextHearingDate: string | null;
  lastHearingDate: string | null;
};

const STATUS_OPTIONS = [
  "Filed",
  "Notice",
  "Pleadings",
  "Issues",
  "Evidence",
  "Arguments",
  "Reserved",
  "Judgment",
  "Disposed",
];

export default function HearingTrackClient({
  bucket,
  items,
  counts,
  officeName,
}: {
  bucket: Bucket;
  items: HearingRow[];
  counts: { today: number; tomorrow: number; pending: number };
  officeName: string;
}) {
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
          Hearing Track
        </h2>
        <p
          className="mt-2 text-[13px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Date-wise and pending matters.
        </p>
      </div>

      {/* Tab strip */}
      <Tabs bucket={bucket} counts={counts} />

      {/* List */}
      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState bucket={bucket} />
        ) : bucket === "pending" ? (
          <div className="space-y-4">
            {items.map((c, i) => (
              <PendingCard
                key={c.id}
                c={c}
                index={i}
                officeName={officeName}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((c, i) => (
              <ScheduledRow
                key={c.id}
                c={c}
                index={i}
                officeName={officeName}
                bucket={bucket}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Tabs ─── */

function Tabs({
  bucket,
  counts,
}: {
  bucket: Bucket;
  counts: { today: number; tomorrow: number; pending: number };
}) {
  const tabs: { key: Bucket; label: string; count: number }[] = [
    { key: "today", label: "Today", count: counts.today },
    { key: "tomorrow", label: "Tomorrow", count: counts.tomorrow },
    { key: "pending", label: "Pending", count: counts.pending },
  ];

  return (
    <div
      className="mt-6 inline-flex items-center gap-1 rounded-xl p-1"
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
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] transition-all"
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

/* ─── Today/Tomorrow row ─── */

function ScheduledRow({
  c,
  index,
  officeName,
  bucket,
}: {
  c: HearingRow;
  index: number;
  officeName: string;
  bucket: Bucket;
}) {
  const courtLine = [c.courtName, c.courtPlace].filter(Boolean).join(", ");
  const telLink = buildTelLink(c);
  const waLink = buildWhatsAppLink(c, officeName, bucket);

  return (
    <div
      className="fade-up-sm group relative flex items-center gap-5 rounded-xl p-5 transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        borderLeft: "3px solid var(--color-app-copper)",
        animationDelay: `${Math.min(index, 10) * 35}ms`,
      }}
    >
      <Link
        href={`/app/cases/${c.id}`}
        className="min-w-0 flex-1"
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
              <span
                style={{
                  color: "var(--color-app-ink)",
                  fontWeight: 600,
                }}
              >
                {c.clientName}
              </span>
            ) : null}
            {c.clientName && courtLine ? (
              <span style={{ color: "var(--color-app-copper-deep)" }}>
                {" "}
                ·{" "}
              </span>
            ) : null}
            {courtLine ? (
              <span style={{ color: "var(--color-app-fg-muted)" }}>
                {courtLine}
              </span>
            ) : null}
          </div>
        )}
      </Link>

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
        <Link
          href={`/app/cases/${c.id}`}
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[12px] font-semibold transition-all hover:-translate-y-0.5"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: "var(--color-app-copper)",
            color: "var(--color-app-copper-text)",
            boxShadow: "0 6px 16px -10px rgba(197,133,58,0.6)",
          }}
        >
          Open
        </Link>
      </div>
    </div>
  );
}

/* ─── Pending card ─── */

function PendingCard({
  c,
  index,
  officeName,
}: {
  c: HearingRow;
  index: number;
  officeName: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [date, setDate] = useState("");
  const [status, setStatus] = useState(c.status || "Filed");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const telLink = buildTelLink(c);
  const waLink = buildWhatsAppLink(c, officeName, "pending");

  async function onUpdate() {
    setError(null);
    if (!date) {
      setError("Please pick a next hearing date.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/app/cases/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextHearingDate: date,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't update");
        setSaving(false);
        return;
      }
      setSavedFlash(true);
      // After a beat, refresh the server page so this row leaves the Pending bucket
      setTimeout(() => {
        startTransition(() => {
          router.refresh();
        });
      }, 350);
    } catch {
      setError("Network error.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fade-up-sm rounded-xl p-6"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        animationDelay: `${Math.min(index, 10) * 35}ms`,
        opacity: savedFlash ? 0.55 : 1,
        transition: "opacity 250ms ease",
      }}
    >
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
          <div
            className="mt-1.5 text-[13px]"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-soft)",
            }}
          >
            {c.clientName ? (
              <span
                style={{ color: "var(--color-app-ink)", fontWeight: 600 }}
              >
                {c.clientName}
              </span>
            ) : (
              <span style={{ color: "var(--color-app-fg-muted)" }}>—</span>
            )}
            {c.cnr ? (
              <>
                <span style={{ color: "var(--color-app-copper-deep)" }}>
                  {" "}
                  ·{" "}
                </span>
                <span style={{ color: "var(--color-app-fg-muted)" }}>
                  CNR {c.cnr}
                </span>
              </>
            ) : null}
          </div>
          {c.lastHearingDate ? (
            <div
              className="mt-1 text-[12px]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                color: "var(--color-app-fg-muted)",
              }}
            >
              Last date:{" "}
              <span
                style={{
                  color: "var(--color-app-ink)",
                  fontWeight: 600,
                }}
              >
                {c.lastHearingDate.slice(0, 10)}
              </span>
            </div>
          ) : null}
        </div>
        <span
          className="shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            backgroundColor: "var(--color-app-copper)",
            color: "var(--color-app-copper-text)",
          }}
        >
          Pending next date
        </span>
      </div>

      {/* Update form */}
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <div>
          <label
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-fg-muted)",
            }}
          >
            Next hearing
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 block w-full rounded-md border px-3.5 py-2.5 text-[14px] outline-none transition-all"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              borderColor: error
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
              e.currentTarget.style.borderColor = error
                ? "var(--color-app-danger)"
                : "var(--color-app-edge)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
        <div>
          <label
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-fg-muted)",
            }}
          >
            Status
          </label>
          <div className="relative mt-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full appearance-none rounded-md border px-3.5 py-2.5 text-[14px] outline-none transition-all"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                borderColor: "var(--color-app-edge)",
                backgroundColor: "var(--color-app-paper)",
                color: "var(--color-app-ink)",
                paddingRight: 36,
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-app-fg-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
        <div className="flex items-end">
          <button
            onClick={onUpdate}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md px-6 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              backgroundColor: "var(--color-app-copper)",
              color: "var(--color-app-copper-text)",
              opacity: saving ? 0.6 : 1,
              boxShadow: "0 8px 20px -10px rgba(197,133,58,0.6)",
              minWidth: 120,
            }}
          >
            {saving ? "Updating…" : savedFlash ? "Updated ✓" : "Update"}
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

      {/* Contact buttons */}
      <div className="mt-5 flex flex-wrap gap-2">
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
  // Filled, high-contrast circles. Saturated when active; muted-but-readable
  // when disabled so the buttons never look like ghosts.
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
      ? {
          backgroundColor: "#9bbfa8",
          color: "#ffffff",
        }
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
          backgroundColor: "#25d366",
          color: "#0b3d22",
          border: "1px solid transparent",
          boxShadow: "0 6px 16px -10px rgba(37,211,102,0.55)",
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

/* ─── Empty state ─── */

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
        : {
            title: "No pending dates. Inbox zero.",
            body: "Every matter in the vault has its next hearing date set. Update from a case page or the daily diary.",
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

/* ─── Helpers ─── */

function buildTelLink(c: HearingRow): string | null {
  const target = (c.clientPhone || c.clientWhatsapp || "").replace(/\s+/g, "");
  if (!target) return null;
  return `tel:${target}`;
}

function buildWhatsAppLink(
  c: HearingRow,
  officeName: string,
  bucket: Bucket
): string | null {
  const raw = (c.clientWhatsapp || c.clientPhone || "").replace(/\D/g, "");
  if (!raw) return null;
  const wa = raw.length === 10 ? `91${raw}` : raw;

  const dateStr =
    bucket === "today"
      ? "today"
      : bucket === "tomorrow"
        ? "tomorrow"
        : c.nextHearingDate
          ? new Date(c.nextHearingDate).toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "the date communicated separately";

  const venue =
    [c.courtName, c.courtPlace].filter(Boolean).join(", ") ||
    "the Hon'ble Court";
  const office = officeName || "this office";
  const matter = c.oppositeParty
    ? `${c.clientName || "you"} vs ${c.oppositeParty}`
    : c.caseNo;

  const lines = [
    `Dear Mr./Ms. ${c.clientName || "Client"},`,
    ``,
    `Warm greetings from ${office}.`,
    ``,
    `This is to formally apprise you that the next hearing in your matter ${c.caseNo}` +
      (c.oppositeParty ? ` (${matter})` : ``) +
      ` is scheduled ${dateStr} before the ${venue}.`,
    ``,
    `You are kindly requested to ensure your presence on the said date and time, accompanied by all relevant documents previously discussed, so as to enable us to proceed with your matter without procedural complication.`,
    ``,
    `For any clarification or to revisit the brief prior to the hearing, please feel free to contact our office at your convenience.`,
    ``,
    `Thank you for your continued cooperation and trust.`,
    ``,
    `Regards,`,
    office,
  ];

  return `https://wa.me/${wa}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/* ─── Icons ─── */

function PhoneIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
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

function WhatsAppIcon({ size = 19 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.5 3.5A11 11 0 0 0 3 16.7L1.5 22l5.4-1.4A11 11 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4-1.1l-.3-.2-3.2.8.9-3.1-.2-.3A8 8 0 1 1 12 20zm4.5-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.1-.5 0a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2 0-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3a2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5s1.7 2.6 4.1 3.6a14 14 0 0 0 1.4.5 3.4 3.4 0 0 0 1.5.1c.5-.1 1.4-.6 1.6-1.1s.2-1 .1-1.1z" />
    </svg>
  );
}
