"use client";

import Link from "next/link";

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
  const telLink = buildTelLink(c);
  const waLink = buildWhatsAppLink(c, officeName, "pending");

  // Two flavours of pending — the previous date passed without being
  // replaced (overdue) or the matter was never given a next date
  // (undated). The badge + tagline change accordingly so the advocate
  // can tell at a glance which case is asking what.
  const overdueDays = overdueDaysFor(c.nextHearingDate);
  const isOverdue = overdueDays !== null;

  return (
    <div
      className="fade-up-sm rounded-xl p-6"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        borderLeft: isOverdue
          ? "3px solid var(--color-app-danger)"
          : "3px solid var(--color-app-copper)",
        animationDelay: `${Math.min(index, 10) * 35}ms`,
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
          {/* The "last date" line is only useful for undated matters —
              for overdue ones the next date is itself the meaningful
              past date and we surface it in the badge column instead. */}
          {!isOverdue && c.lastHearingDate ? (
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
                <span
                  style={{
                    color: "var(--color-app-ink)",
                    fontWeight: 600,
                  }}
                >
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

      {/* Action row — Update hearing primary, Call + WhatsApp secondary.
          The Update hearing link drops the user onto the case detail
          page with the URL fragment that scrolls them directly to the
          Update Hearing form. They edit there, save, and the next page
          load removes this row from the Pending bucket. */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href={`/app/cases/${c.id}#update-hearing`}
          className="inline-flex items-center gap-1.5 rounded-md px-5 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: "var(--color-app-copper)",
            color: "var(--color-app-copper-text)",
            boxShadow: "0 8px 20px -10px rgba(197,133,58,0.6)",
          }}
        >
          <CalendarIcon />
          Update hearing
          <span aria-hidden style={{ opacity: 0.8 }}>
            →
          </span>
        </Link>
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

// Whole-day diff between nextHearingDate and today in the browser's
// local timezone. Returns null when the date is missing, or 0+ for an
// overdue (today is not in pending so 0 shouldn't normally appear; we
// still handle it to avoid edge-case crashes).
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

function CalendarIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
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
      <path
        d="M9 14h2v2H9z"
        fill="currentColor"
      />
    </svg>
  );
}

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
