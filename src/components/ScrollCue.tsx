"use client";

import { useCallback, useRef } from "react";

const inter = "var(--font-inter), system-ui, sans-serif";

// A refined scroll affordance pinned to the bottom-centre of a hero: a gold
// "Scroll" label over a ringed, gently-bobbing chevron. Click smooth-scrolls
// to the next <section>. Honours prefers-reduced-motion. Drawn in heritage
// gold so it reads on the dark heroes (the navy band and the library photo).
export default function ScrollCue({ label = "Scroll" }: { label?: string }) {
  const ref = useRef<HTMLButtonElement>(null);

  const onClick = useCallback(() => {
    const here = ref.current?.closest("section");
    const next = here?.nextElementSibling as HTMLElement | null;
    if (next) {
      next.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollBy({
        top: Math.round(window.innerHeight * 0.85),
        behavior: "smooth",
      });
    }
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label="Scroll to the next section"
      className="le-cue absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2.5 md:bottom-9"
    >
      <style>{`
        @keyframes le-cue-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
        .le-cue-chev { animation: le-cue-bob 1.9s ease-in-out infinite; }
        .le-cue-ring { transition: border-color .25s ease, background-color .25s ease; }
        .le-cue:hover .le-cue-ring { background-color: rgba(212,175,110,0.16); border-color: rgba(212,175,110,0.95); }
        @media (prefers-reduced-motion: reduce) { .le-cue-chev { animation: none; } }
      `}</style>
      <span
        className="text-[10px] uppercase tracking-[0.34em]"
        style={{ fontFamily: inter, color: "var(--color-heritage-gold)" }}
      >
        {label}
      </span>
      <span
        className="le-cue-ring flex h-9 w-9 items-center justify-center rounded-full border"
        style={{ borderColor: "rgba(212,175,110,0.55)" }}
      >
        <svg className="le-cue-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 9l6 6 6-6"
            stroke="var(--color-heritage-gold)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
