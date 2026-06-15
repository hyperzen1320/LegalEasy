import Link from "next/link";
import Logo from "./Logo";
import { NAV } from "@/lib/nav";

const playfair = "var(--font-playfair), Georgia, serif";
const inter = "var(--font-inter), system-ui, sans-serif";

const OFFICE = [
  "Nambiraj Law Dynasty LLP.,",
  "H-14, T.N.H.B. Colony, 2nd Phase,",
  "Krishnagiri - 635 002",
  "+91 93537 04141 · +91 63695 04141",
  "nambirajlawdynasty@gmail.com",
];

const CONNECT = [
  { name: "LinkedIn", href: "#", icon: <LinkedInIcon /> },
  { name: "Legal Publications", href: "#", icon: <PublicationIcon /> },
  { name: "Inquiry Form", href: "/contact", icon: <InquiryIcon /> },
];

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "var(--color-heritage-navy)" }}>
      <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-3.5">
              <Logo size={54} className="shrink-0" />
              <div
                className="text-[22px] font-bold leading-[1.1] tracking-[0.04em] md:text-[26px]"
                style={{ fontFamily: playfair, color: "#ffffff" }}
              >
                NAMBIRAJ
                <br />
                LAW DYNASTY
              </div>
            </div>
            <p
              className="mt-6 max-w-sm text-[15px] leading-7"
              style={{ fontFamily: inter, color: "rgba(255,255,255,0.62)" }}
            >
              Continuing a 55-year legacy of legal excellence. Dedicated to the
              vision of Mr. C. Nambiraj.
            </p>
          </div>

          {/* Explore */}
          <div className="md:col-span-2">
            <div
              className="text-[11px] uppercase tracking-[0.22em]"
              style={{ fontFamily: inter, color: "var(--color-heritage-gold)" }}
            >
              Explore
            </div>
            <ul className="mt-5 space-y-3">
              {NAV.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-[14px] transition-colors hover:text-white"
                    style={{ fontFamily: inter, color: "rgba(255,255,255,0.75)" }}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Office */}
          <div className="md:col-span-3">
            <div
              className="text-[11px] uppercase tracking-[0.22em]"
              style={{ fontFamily: inter, color: "var(--color-heritage-gold)" }}
            >
              Office
            </div>
            <div className="mt-5 space-y-2">
              {OFFICE.map((line, i) => (
                <div
                  key={i}
                  className="text-[14px] leading-6"
                  style={{ fontFamily: inter, color: "rgba(255,255,255,0.75)" }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Connect */}
          <div className="md:col-span-3">
            <div
              className="text-[11px] uppercase tracking-[0.22em]"
              style={{ fontFamily: inter, color: "var(--color-heritage-gold)" }}
            >
              Connect
            </div>
            <ul className="mt-5 space-y-3">
              {CONNECT.map((l) => (
                <li key={l.name}>
                  <Link
                    href={l.href}
                    className="group inline-flex items-center gap-2.5 text-[14px] transition-colors hover:text-white"
                    style={{ fontFamily: inter, color: "rgba(255,255,255,0.75)" }}
                  >
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors group-hover:border-[var(--color-heritage-gold)]"
                      style={{ borderColor: "rgba(255,255,255,0.18)", color: "var(--color-heritage-gold)" }}
                    >
                      {l.icon}
                    </span>
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="mt-16 border-t pt-6 text-center text-[11px] uppercase tracking-[0.2em]"
          style={{
            fontFamily: inter,
            borderColor: "rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          © 2026 Nambiraj Law Dynasty LLP. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21H19v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V21H9z" />
    </svg>
  );
}

function PublicationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InquiryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16v12H4zM4 7l8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
