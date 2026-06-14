"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { LOGO_MARK_JPG, LOGO_W, LOGO_H } from "@/lib/brand";

// A product "calling card" that slides in from the right a few seconds after a
// company page settles, inviting the visitor into the Client Diary product.
// Each page gets its own creative line and its own destination, so the nudge
// always feels written for where you're standing — never a generic banner.
//
// Behaviour the office asked for:
//  • appears once per page visit (re-arms on navigation, and on a refresh,
//    since nothing is persisted);
//  • auto-retires after a short while so a visitor who lingers is never nagged;
//  • clicking the card — or "yes" — opens the product; "Maybe later" / ✕ closes.

const playfair = "var(--font-playfair), Georgia, serif";
const inter = "var(--font-inter), system-ui, sans-serif";

type Ad = {
  badge: string;
  tag: string;
  title: string;
  body: string;
  cta: string;
  href: string;
};

const ADS: Record<string, Ad> = {
  "/": {
    badge: "Client Diary",
    tag: "An introduction",
    title: "Do you wanna try out our Client Diary?",
    body: "The advocate's office, set in order — cause-lists, hearings and matters in one calm place.",
    cta: "Yes, show me",
    href: "/product",
  },
  "/about": {
    badge: "Since 1969",
    tag: "Heritage, digitised",
    title: "Fifty-five years of practice, now in your pocket.",
    body: "The same discipline behind this dynasty, running quietly as a daily Client Diary.",
    cta: "See the story",
    href: "/product",
  },
  "/practicing-area": {
    badge: "Every domain",
    tag: "One Cabinet",
    title: "Civil, criminal, corporate — filed in a single Cabinet.",
    body: "Whatever the practice area, every matter and cause-list lives in one place.",
    cta: "Open the Cabinet",
    href: "/product#cabinet",
  },
  "/services": {
    badge: "Your service",
    tag: "Our software",
    title: "Hearing alerts that reach your client first.",
    body: "Bilingual notices, document export and senior-desk briefings — built right in.",
    cta: "View the features",
    href: "/product#export",
  },
  "/our-team": {
    badge: "Your chambers",
    tag: "Run it like ours",
    title: "One shared diary for every advocate and clerk.",
    body: "Assign matters, track hearings and brief the senior desk — all together.",
    cta: "Meet the workspace",
    href: "/product#chambers",
  },
  "/contact": {
    badge: "Before you call",
    tag: "A two-minute look",
    title: "Peek inside the diary your matters will live in.",
    body: "See exactly where your case will sit, then let's talk numbers.",
    cta: "Take a look",
    href: "/product#pricing",
  },
};

function pickAd(pathname: string): Ad {
  if (ADS[pathname]) return ADS[pathname];
  const hit = Object.keys(ADS).find(
    (k) => k !== "/" && pathname.startsWith(k),
  );
  return hit ? ADS[hit] : ADS["/"];
}

type Phase = "idle" | "in" | "out";

export default function ProductNudge() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const ad = pickAd(pathname);

  useEffect(() => setMounted(true), []);

  // One nudge per page. Reset on every route change, then arrive after a beat —
  // long enough for the hand cue to have its moment first.
  useEffect(() => {
    setPhase("idle");
    const show = setTimeout(() => setPhase("in"), 3600);
    return () => clearTimeout(show);
  }, [pathname]);

  // Retire on its own so a lingering visitor is left in peace.
  useEffect(() => {
    if (phase !== "in") return;
    const hide = setTimeout(() => setPhase("out"), 10000);
    return () => clearTimeout(hide);
  }, [phase]);

  // Unmount once the exit has played.
  useEffect(() => {
    if (phase !== "out") return;
    const done = setTimeout(() => setPhase("idle"), 480);
    return () => clearTimeout(done);
  }, [phase]);

  if (!mounted || phase === "idle") return null;

  const open = () => {
    setPhase("out");
    router.push(ad.href);
  };
  const close = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhase("out");
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 bottom-24 z-[9999] flex justify-end sm:inset-x-auto sm:bottom-24 sm:right-6">
      <style>{KEYFRAMES}</style>
      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        className="le-nudge-card pointer-events-auto relative w-full max-w-[400px] cursor-pointer overflow-hidden rounded-[16px] sm:w-[362px]"
        style={{
          backgroundColor: "var(--color-heritage-paper)",
          border: "1px solid var(--color-heritage-border)",
          boxShadow:
            "0 26px 64px -20px rgba(14,26,43,0.46), 0 6px 18px -8px rgba(14,26,43,0.20)",
          animation:
            phase === "out"
              ? "le-nudge-out 440ms cubic-bezier(0.4,0,0.7,0.2) forwards"
              : "le-nudge-in 640ms cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        {/* gold hairline crowning the card */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{
            background:
              "linear-gradient(90deg, var(--color-heritage-gold-deep), var(--color-heritage-gold), var(--color-heritage-gold-deep))",
          }}
        />
        {/* warm glow pooling in the corner */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(182,139,60,0.20), transparent 70%)",
          }}
        />
        {/* one-time light sweep on arrival */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <span
            className="absolute inset-y-0 w-1/3"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
              animation:
                phase === "in"
                  ? "le-nudge-shimmer 1100ms ease-out 220ms both"
                  : "none",
            }}
          />
        </span>

        <div className="relative px-4 pb-4 pt-3.5">
          {/* masthead row */}
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-white"
              style={{ boxShadow: "0 1px 4px rgba(14,26,43,0.16)" }}
            >
              <Image
                src={LOGO_MARK_JPG}
                alt=""
                width={LOGO_W}
                height={LOGO_H}
                className="object-contain"
                style={{ height: 23, width: "auto" }}
              />
            </span>
            <div className="leading-tight">
              <div
                className="text-[13px] font-bold tracking-wide"
                style={{ fontFamily: playfair, color: "var(--color-heritage-navy)" }}
              >
                {ad.badge}
              </div>
              <div
                className="text-[8.5px] uppercase tracking-[0.2em]"
                style={{ fontFamily: inter, color: "var(--color-heritage-muted)" }}
              >
                from Legalezi
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Dismiss"
              className="ml-auto -mr-1 flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-heritage-stone)]"
              style={{ color: "var(--color-heritage-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* page-specific eyebrow */}
          <div className="mt-3 flex items-center gap-2">
            <span
              className="h-px w-5"
              style={{ backgroundColor: "var(--color-heritage-gold)" }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{
                fontFamily: inter,
                color: "var(--color-heritage-gold-deep)",
              }}
            >
              {ad.tag}
            </span>
          </div>

          {/* headline */}
          <h3
            className="mt-2 text-[18.5px] font-bold leading-[1.2]"
            style={{ fontFamily: playfair, color: "var(--color-heritage-navy)" }}
          >
            {ad.title}
          </h3>

          {/* body */}
          <p
            className="mt-1.5 text-[12.5px] leading-[1.55]"
            style={{ fontFamily: inter, color: "var(--color-heritage-muted)" }}
          >
            {ad.body}
          </p>

          {/* actions */}
          <div className="mt-3.5 flex items-center gap-3">
            <span
              className="group/cta inline-flex items-center gap-2 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.13em]"
              style={{
                fontFamily: inter,
                backgroundColor: "var(--color-heritage-navy)",
                color: "#ffffff",
              }}
            >
              {ad.cta}
              <span
                className="transition-transform duration-200 group-hover/cta:translate-x-0.5"
                style={{ color: "var(--color-heritage-gold)" }}
              >
                →
              </span>
            </span>
            <button
              type="button"
              onClick={close}
              className="text-[12px] transition-colors hover:text-[var(--color-heritage-navy)]"
              style={{ fontFamily: inter, color: "var(--color-heritage-muted)" }}
            >
              Maybe later
            </button>
          </div>
        </div>

        {/* auto-retire countdown */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[3px]"
          style={{ backgroundColor: "var(--color-heritage-stone)" }}
        >
          <span
            className="block h-full origin-left"
            style={{
              backgroundColor: "var(--color-heritage-gold)",
              animation:
                phase === "in" ? "le-nudge-count 10s linear forwards" : "none",
            }}
          />
        </span>
      </div>
    </div>,
    document.body,
  );
}

const KEYFRAMES = `
  @keyframes le-nudge-in {
    0%   { opacity: 0; transform: translateX(120%) scale(0.96); }
    68%  { opacity: 1; transform: translateX(-2%) scale(1.006); }
    100% { opacity: 1; transform: translateX(0) scale(1); }
  }
  @keyframes le-nudge-out {
    0%   { opacity: 1; transform: translateX(0) scale(1); }
    100% { opacity: 0; transform: translateX(125%) scale(0.97); }
  }
  @keyframes le-nudge-shimmer {
    0%   { transform: translateX(-160%) skewX(-18deg); opacity: 0; }
    40%  { opacity: 0.85; }
    100% { transform: translateX(360%) skewX(-18deg); opacity: 0; }
  }
  @keyframes le-nudge-count {
    from { transform: scaleX(1); }
    to   { transform: scaleX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .le-nudge-card { animation: le-nudge-in 1ms both !important; }
  }
`;
