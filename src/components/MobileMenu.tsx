"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

type NavItem = { name: string; href: string };

// The marketing header's mobile navigation. The desktop header keeps its
// inline nav + Sign in (hidden below md); on phones those are unreachable,
// so this renders a hamburger (md:hidden) that opens a full-screen "paper"
// sheet with the section nav, a prominent Sign in, and the Request Access
// CTA. Behaviour mirrors the app shell drawer: Esc closes, body scroll is
// locked while open, focus moves into the sheet and is restored on close,
// and it auto-closes if the viewport grows to desktop.
export default function MobileMenu({ nav }: { nav: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Esc to close + lock the page behind the sheet + move focus into it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // If the viewport grows to desktop while open, close so we never leave a
  // stuck full-screen sheet / locked scroll behind the md+ layout.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu-sheet"
        onClick={() => setOpen((o) => !o)}
        className="-mr-1 flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-brass-deep"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open
        ? createPortal(
        <div
          id="mobile-menu-sheet"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          tabIndex={-1}
          className="fade-up-sm fixed inset-0 z-50 flex flex-col bg-paper outline-none md:hidden"
        >
          {/* faint paper grain, matching the hero/login surfaces */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04] paper-grain"
          />

          {/* top bar — aligns with the real header's logo / trigger slots */}
          <div className="relative mx-auto flex w-full max-w-[1320px] items-center justify-between px-6 py-4">
            <Link href="/" onClick={close} className="flex items-center gap-3">
              <div className="leading-none">
                <div className="font-display text-[24px] font-medium tracking-[-0.01em] text-ink">
                  LegalEasy
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-brass-deep">
                  Advocate · Edition
                </div>
              </div>
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={close}
              className="-mr-1 flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-brass-deep"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="relative h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent" />

          {/* scrollable menu body */}
          <nav className="relative mx-auto w-full max-w-[1320px] flex-1 overflow-y-auto px-6 py-8">
            <div className="border-t border-ink/15">
              {nav.map((item, i) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={close}
                  className="group flex items-baseline gap-5 border-b border-rule/50 py-5"
                >
                  <span className="font-mono text-[11px] tracking-[0.18em] text-brass">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-[30px] leading-none text-ink transition-colors group-hover:text-brass-deep">
                    {item.name}
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={close}
                className="group flex items-center justify-between border border-ink/30 px-6 py-4 font-mono text-[12px] uppercase tracking-[0.18em] text-ink transition-colors hover:border-ink hover:bg-paper-2"
              >
                Sign in
                <span className="text-brass-deep transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <Link
                href="#access"
                onClick={close}
                className="group flex items-center justify-between border border-ink bg-ink px-6 py-4 font-mono text-[12px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-ink-2"
              >
                Request Access
                <span className="text-brass transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-brass-deep">
              <span className="inline-block h-px w-10 bg-brass" />
              <span>Vol. I · No. 01 · Advocate Office Edition</span>
            </div>
          </nav>
        </div>,
            document.body
          )
        : null}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
