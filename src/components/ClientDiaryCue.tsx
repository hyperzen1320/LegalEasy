"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// A few warm gold glow pulses around the Advocate Diary button when a company
// page settles — a quiet nudge for the eye, no pointing hand. Re-cues on every
// navigation / refresh and never blocks a click. (Replaces the old manicule.)
export default function ClientDiaryCue() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(false);
    const start = setTimeout(() => setActive(true), 650);
    // ~3 pulses at 1300ms each, then bow out (matches the old cue's timing).
    const stop = setTimeout(() => setActive(false), 4900);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [pathname]);

  if (!active) return null;

  return (
    <span aria-hidden className="le-diary-glow pointer-events-none absolute inset-0">
      <style>{`
        .le-diary-glow {
          border-radius: 2px;
          animation: le-diary-glow 1300ms ease-out 3;
        }
        @keyframes le-diary-glow {
          0%   { box-shadow: 0 0 0 0 rgba(182,139,60,0), 0 0 0 0 rgba(212,176,116,0); }
          22%  { box-shadow: 0 0 22px 3px rgba(212,176,116,0.9), 0 0 0 2px rgba(182,139,60,0.55); }
          100% { box-shadow: 0 0 0 0 rgba(182,139,60,0), 0 0 0 16px rgba(182,139,60,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .le-diary-glow { animation: none; box-shadow: 0 0 0 2px rgba(182,139,60,0.4); }
        }
      `}</style>
    </span>
  );
}
