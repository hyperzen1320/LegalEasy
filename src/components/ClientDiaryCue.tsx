"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// A manicule — the old engraver's pointing hand (☞) — that nudges the eye to
// the "Client Diary" button the moment a company page opens. A printer's mark
// is exactly right for a 1969 law dynasty: it reads as heritage, not a pop-up.
// Lives inside the Header, anchored to the button, so it tracks it perfectly.
// Plays once per page (re-arms on navigation / refresh), never blocks a click.

export default function ClientDiaryCue() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Re-cue on every page the visitor lands on; a refresh remounts and cues
    // again. Let the page settle first, then bow out before the card arrives.
    setActive(false);
    const start = setTimeout(() => setActive(true), 650);
    const stop = setTimeout(() => setActive(false), 4400);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [pathname]);

  if (!active) return null;

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-50">
      <style>{KEYFRAMES}</style>

      {/* Gold halo breathing around the button */}
      <span className="le-cue-ring" />

      {/* The pointing hand, tapping up at the button from below */}
      <span className="le-cue-hand">
        <svg
          width="46"
          height="60"
          viewBox="0 0 46 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* thumb */}
          <rect
            x="6.5"
            y="29"
            width="9"
            height="17"
            rx="4.5"
            transform="rotate(-26 11 37.5)"
            fill="#f6efdf"
            stroke="#0e1a2b"
            strokeWidth="2"
          />
          {/* fist / palm */}
          <rect
            x="13"
            y="25"
            width="25"
            height="24"
            rx="9"
            fill="#f6efdf"
            stroke="#0e1a2b"
            strokeWidth="2"
          />
          {/* index finger, pointing up */}
          <rect
            x="18"
            y="3"
            width="11"
            height="30"
            rx="5.5"
            fill="#f6efdf"
            stroke="#0e1a2b"
            strokeWidth="2"
          />
          {/* curled-finger grooves */}
          <path
            d="M30.5 28v6.5M34.5 28.5v5.5"
            stroke="#0e1a2b"
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity="0.4"
          />
          {/* sleeve cuff */}
          <rect x="11" y="44" width="30" height="13" rx="4" fill="#0e1a2b" />
          {/* gold cuff bands */}
          <rect x="11" y="44" width="30" height="4" rx="2" fill="#b68b3c" />
          <rect
            x="11"
            y="53.4"
            width="30"
            height="2"
            fill="#b68b3c"
            opacity="0.85"
          />
        </svg>
      </span>
    </span>
  );
}

const KEYFRAMES = `
  .le-cue-ring {
    position: absolute;
    inset: -3px;
    border-radius: 3px;
    animation: le-cue-ring 1300ms ease-out infinite;
  }
  .le-cue-hand {
    position: absolute;
    top: calc(100% - 7px);
    right: 16px;
    transform-origin: top center;
    filter: drop-shadow(0 6px 8px rgba(14, 26, 43, 0.30));
    animation:
      le-cue-jab 1300ms cubic-bezier(0.4, 0, 0.2, 1) infinite,
      le-cue-fade 4400ms ease-out forwards;
  }
  @keyframes le-cue-ring {
    0%   { box-shadow: 0 0 0 0 rgba(182, 139, 60, 0.55); }
    70%  { box-shadow: 0 0 0 13px rgba(182, 139, 60, 0); }
    100% { box-shadow: 0 0 0 0 rgba(182, 139, 60, 0); }
  }
  @keyframes le-cue-jab {
    0%   { transform: translateY(9px) rotate(-10deg); }
    22%  { transform: translateY(-3px) rotate(-10deg); }
    44%  { transform: translateY(9px) rotate(-10deg); }
    64%  { transform: translateY(0px) rotate(-10deg); }
    100% { transform: translateY(9px) rotate(-10deg); }
  }
  @keyframes le-cue-fade {
    0%   { opacity: 0; }
    9%   { opacity: 1; }
    82%  { opacity: 1; }
    100% { opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .le-cue-hand { animation: le-cue-fade 4400ms ease-out forwards; }
    .le-cue-ring { animation: none; box-shadow: 0 0 0 3px rgba(182, 139, 60, 0.35); }
  }
`;
