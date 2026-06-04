import Link from "next/link";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Case } from "@/models/Case";

export default async function PartnerDashboard() {
  const session = await auth();
  const firstName = session?.user?.firstName ?? "Counsel";
  const partnerId = session?.user?.partnerId
    ? new mongoose.Types.ObjectId(session.user.partnerId)
    : null;

  // Date boundaries — today / tomorrow / day-after
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfToday.getDate() + 1);
  const startOfDayAfter = new Date(startOfToday);
  startOfDayAfter.setDate(startOfToday.getDate() + 2);

  let stats = {
    todayHearings: 0,
    tomorrowHearings: 0,
    pendingDates: 0,
    caseVault: 0,
  };
  let todaysBoard: Array<{
    id: string;
    caseNo: string;
    status: string;
    clientName: string;
    courtName: string;
    courtPlace: string;
    nextHearingDate: string | null;
  }> = [];

  if (partnerId) {
    await connectDB();
    // Disposed cases stay out of every dashboard tile and the today's
    // board cause-list — they only appear in /app/disposed-cases.
    const activeFilter = {
      partnerId,
      isDeleted: false,
      disposedAt: null,
    } as const;
    const [today, tomorrow, pending, vault, boardDocs] = await Promise.all([
      Case.countDocuments({
        ...activeFilter,
        nextHearingDate: { $gte: startOfToday, $lt: startOfTomorrow },
      }),
      Case.countDocuments({
        ...activeFilter,
        nextHearingDate: { $gte: startOfTomorrow, $lt: startOfDayAfter },
      }),
      Case.countDocuments({
        ...activeFilter,
        $or: [
          { nextHearingDate: null },
          { nextHearingDate: { $lt: startOfToday } },
        ],
      }),
      Case.countDocuments(activeFilter),
      Case.find({
        ...activeFilter,
        nextHearingDate: {
          $gte: startOfToday,
          $lt: new Date(startOfToday.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
      })
        .sort({ nextHearingDate: 1 })
        .limit(5)
        .lean(),
    ]);

    stats = {
      todayHearings: today,
      tomorrowHearings: tomorrow,
      pendingDates: pending,
      caseVault: vault,
    };
    todaysBoard = boardDocs.map((c) => ({
      id: String(c._id),
      caseNo: c.caseNo,
      status: c.status,
      clientName: c.clientName,
      courtName: c.courtName,
      courtPlace: c.courtPlace,
      nextHearingDate: c.nextHearingDate
        ? c.nextHearingDate.toISOString()
        : null,
    }));
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? "Late night"
      : hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1280px] space-y-8">
        <Hero
          greeting={greeting}
          firstName={firstName}
          stats={stats}
        />

        <StatsRow stats={stats} />

        <PhaseTwoCallouts />

        <TodaysBoard cases={todaysBoard} />
      </div>
    </div>
  );
}

/* ──────────────── Hero ──────────────── */

function Hero({
  greeting,
  firstName,
  stats,
}: {
  greeting: string;
  firstName: string;
  stats: { todayHearings: number; pendingDates: number };
}) {
  const today = new Date();
  const eyebrow = today
    .toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();

  return (
    <section
      className="fade-up-sm relative overflow-hidden rounded-2xl px-6 py-8 sm:px-10 sm:py-12"
      style={{
        background: `linear-gradient(135deg, var(--color-app-ink) 0%, var(--color-app-ink-2) 100%)`,
      }}
    >
      {/* Decorative scales SVG, large, low-opacity, copper */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-[420px] w-[420px]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <g
          stroke="var(--color-app-copper)"
          strokeWidth="0.6"
          strokeOpacity="0.18"
          fill="none"
        >
          <line x1="100" y1="30" x2="100" y2="160" />
          <line x1="60" y1="160" x2="140" y2="160" strokeWidth="1" />
          <line x1="40" y1="65" x2="160" y2="65" strokeWidth="0.8" />
          <path d="M55 65 L40 110 a5 5 0 0 0 30 0 L55 65 Z" />
          <path d="M145 65 L130 110 a5 5 0 0 0 30 0 L145 65 Z" />
          <circle cx="100" cy="30" r="2.5" fill="var(--color-app-copper)" fillOpacity="0.4" />
          <circle cx="100" cy="100" r="80" strokeOpacity="0.06" />
        </g>
      </svg>

      {/* Eyebrow */}
      <div
        className="text-[11px] uppercase tracking-[0.32em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-copper-bright)",
        }}
      >
        {eyebrow}
      </div>

      {/* Greeting */}
      <h2
        className="mt-5 text-[56px] font-semibold leading-[1.04] tracking-tight"
        style={{
          fontFamily: "var(--font-crimson), Georgia, serif",
          color: "var(--color-app-ivory)",
        }}
      >
        {greeting},{" "}
        <span style={{ fontStyle: "italic", color: "var(--color-app-copper-bright)" }}>
          {firstName}.
        </span>
      </h2>

      {/* Body */}
      <p
        className="mt-5 max-w-2xl text-[16px] leading-7"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-ivory-soft)",
        }}
      >
        {stats.todayHearings === 0 && stats.pendingDates === 0 ? (
          <>
            A clear desk today. No hearings scheduled, nothing pending. The
            perfect moment to add new matters or attend to long-term work.
          </>
        ) : (
          <>
            You have{" "}
            <CountInline n={stats.todayHearings} /> {stats.todayHearings === 1 ? "hearing" : "hearings"} scheduled today
            {stats.pendingDates > 0 ? (
              <>
                {" "}and{" "}
                <CountInline n={stats.pendingDates} /> {stats.pendingDates === 1 ? "matter" : "matters"} awaiting next date
              </>
            ) : null}
            .
          </>
        )}
      </p>
    </section>
  );
}

function CountInline({ n }: { n: number }) {
  return (
    <span
      className="font-semibold tabular-nums"
      style={{
        color: "var(--color-app-copper-bright)",
        fontFamily: "var(--font-crimson), Georgia, serif",
      }}
    >
      {n}
    </span>
  );
}

/* ──────────────── Stats row ──────────────── */

function StatsRow({
  stats,
}: {
  stats: {
    todayHearings: number;
    tomorrowHearings: number;
    pendingDates: number;
    caseVault: number;
  };
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Today Hearings"
        value={stats.todayHearings}
        variant="copper"
        href="/app/hearings"
        icon={<IconCalToday />}
        delay={0.05}
      />
      <StatCard
        label="Tomorrow Hearings"
        value={stats.tomorrowHearings}
        variant="ink"
        href="/app/hearings"
        icon={<IconCalNext />}
        delay={0.1}
      />
      <StatCard
        label="Pending Dates"
        value={stats.pendingDates}
        variant="copper"
        href="/app/cases"
        icon={<IconAlert />}
        delay={0.15}
      />
      <StatCard
        label="Case Vault"
        value={stats.caseVault}
        variant="paper"
        href="/app/cases"
        icon={<IconBriefcase />}
        delay={0.2}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  variant,
  href,
  icon,
  delay,
}: {
  label: string;
  value: number;
  variant: "copper" | "ink" | "paper";
  href: string;
  icon: React.ReactNode;
  delay: number;
}) {
  const styles = {
    copper: {
      bg: "var(--color-app-copper)",
      text: "var(--color-app-copper-text)",
      label: "var(--color-app-copper-text)",
      iconBg: "rgba(0,0,0,0.12)",
    },
    ink: {
      bg: "var(--color-app-ink)",
      text: "var(--color-app-ivory)",
      label: "var(--color-app-copper-bright)",
      iconBg: "rgba(255,255,255,0.07)",
    },
    paper: {
      bg: "var(--color-app-paper)",
      text: "var(--color-app-ink)",
      label: "var(--color-app-fg-muted)",
      iconBg: "var(--color-app-canvas-2)",
    },
  }[variant];

  return (
    <Link
      href={href}
      className="fade-up-sm group relative flex flex-col rounded-xl p-6 transition-transform hover:-translate-y-0.5"
      style={{
        backgroundColor: styles.bg,
        animationDelay: `${delay}s`,
        boxShadow:
          variant === "paper"
            ? "0 1px 0 var(--color-app-edge)"
            : "0 8px 24px -12px rgba(10,17,36,0.35)",
      }}
    >
      {/* Icon */}
      <div
        className="mb-5 flex h-9 w-9 items-center justify-center rounded-md"
        style={{ backgroundColor: styles.iconBg, color: styles.text }}
      >
        {icon}
      </div>

      {/* Big number */}
      <div
        className="text-[56px] font-semibold leading-none tabular-nums tracking-tight"
        style={{
          fontFamily: "var(--font-crimson), Georgia, serif",
          color: styles.text,
        }}
      >
        {value}
      </div>

      {/* Label */}
      <div
        className="mt-3 text-[11px] uppercase tracking-[0.18em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: styles.label,
        }}
      >
        {label}
      </div>
    </Link>
  );
}

/* ──────────────── Phase 2 callouts ──────────────── */

function PhaseTwoCallouts() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PhaseCard
        title="Work Flow"
        subtitle="Trello-style boards for office processes."
        icon={<IconBoards />}
        href="/app/workflow"
      />
      <PhaseCard
        title="Senior Desk"
        subtitle="Reminders & advocate coordination — Phase 2"
        icon={<IconDesk />}
      />
    </div>
  );
}

function PhaseCard({
  title,
  subtitle,
  icon,
  href,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: "var(--color-app-canvas-2)",
          color: "var(--color-app-copper-deep)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[20px] font-semibold tracking-tight"
          style={{
            fontFamily: "var(--font-crimson), Georgia, serif",
            color: "var(--color-app-ink)",
          }}
        >
          {title}
        </div>
        <div
          className="mt-0.5 text-[13px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-fg-muted)",
          }}
        >
          {subtitle}
        </div>
      </div>
      {href ? (
        <span
          className="shrink-0"
          style={{ color: "var(--color-app-copper-deep)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14M13 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : null}
    </>
  );

  const className =
    "fade-up-sm flex items-center gap-4 rounded-xl p-5 transition-[transform,box-shadow] duration-200 ease-out" +
    (href ? " hover:-translate-y-0.5" : "");

  const style: React.CSSProperties = {
    backgroundColor: "var(--color-app-paper)",
    boxShadow: "0 1px 0 var(--color-app-edge)",
  };

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={className} style={style}>
      {inner}
    </div>
  );
}

/* ──────────────── Today's Board ──────────────── */

function TodaysBoard({
  cases,
}: {
  cases: Array<{
    id: string;
    caseNo: string;
    status: string;
    clientName: string;
    courtName: string;
    courtPlace: string;
    nextHearingDate: string | null;
  }>;
}) {
  return (
    <section className="fade-up-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <h3
          className="text-[28px] font-semibold tracking-tight"
          style={{
            fontFamily: "var(--font-crimson), Georgia, serif",
            color: "var(--color-app-ink)",
          }}
        >
          Today&rsquo;s Board
        </h3>
        <Link
          href="/app/cases"
          className="text-[13px] font-medium transition-colors"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-copper-deep)",
          }}
        >
          View all →
        </Link>
      </div>

      {cases.length === 0 ? (
        <EmptyBoard />
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <BoardRow key={c.id} c={c} />
          ))}
        </div>
      )}
    </section>
  );
}

function BoardRow({
  c,
}: {
  c: {
    id: string;
    caseNo: string;
    status: string;
    clientName: string;
    courtName: string;
    courtPlace: string;
    nextHearingDate: string | null;
  };
}) {
  return (
    <Link
      href={`/app/cases/${c.id}`}
      className="group flex items-center gap-4 rounded-xl p-5 transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        borderLeft: "3px solid var(--color-app-copper)",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span
            className="text-[18px] font-semibold tracking-tight"
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
        <div
          className="mt-1.5 text-[13px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-fg-soft)",
          }}
        >
          {c.clientName ? (
            <>
              <span className="font-medium">{c.clientName}</span>
              {(c.courtName || c.courtPlace) && (
                <span style={{ color: "var(--color-app-fg-muted)" }}> · </span>
              )}
            </>
          ) : null}
          {c.courtName ? c.courtName : ""}
          {c.courtName && c.courtPlace ? ", " : ""}
          {c.courtPlace ? c.courtPlace : ""}
        </div>
      </div>
      <div
        className="text-[18px] transition-transform group-hover:translate-x-1"
        style={{ color: "var(--color-app-copper-deep)" }}
      >
        →
      </div>
    </Link>
  );
}

function EmptyBoard() {
  return (
    <div
      className="rounded-xl p-12 text-center"
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
        <IconBriefcase />
      </div>
      <h4
        className="mt-5 text-[24px] font-semibold tracking-tight"
        style={{
          fontFamily: "var(--font-crimson), Georgia, serif",
          color: "var(--color-app-ink)",
        }}
      >
        Nothing on the board yet.
      </h4>
      <p
        className="mx-auto mt-2 max-w-md text-[14px] leading-7"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-fg-muted)",
        }}
      >
        Once you add cases and set their next hearing date, the
        upcoming-hearing matters will appear here in chronological order.
      </p>
      <Link
        href="/app/cases/new"
        className="mt-6 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[13px] font-semibold transition-all"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          backgroundColor: "var(--color-app-ink)",
          color: "var(--color-app-ivory)",
        }}
      >
        <span>+</span> Add the first case
      </Link>
    </div>
  );
}

/* ──────────────── Icons ──────────────── */

function IconCalToday() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}
function IconCalNext() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 15l3 3 4-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l10 17H2L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12h18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconBoards() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="6" height="18" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="3" width="6" height="11" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="16" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="19" y="3" width="2" height="18" rx="1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconDesk() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17.5" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14 19c0-2 2-3.5 4-3.5s3.5 1.5 3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="20" cy="5" r="2" fill="currentColor" fillOpacity="0.18" />
    </svg>
  );
}
