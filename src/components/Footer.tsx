import Link from "next/link";

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
  { name: "LinkedIn", href: "#" },
  { name: "Legal Publications", href: "#" },
  { name: "Inquiry Form", href: "/contact" },
];

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "var(--color-heritage-navy)" }}>
      <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-6">
            <div
              className="text-[30px] font-bold tracking-[0.04em] md:text-[36px]"
              style={{ fontFamily: playfair, color: "#ffffff" }}
            >
              NAMBIRAJ LAW DYNASTY
            </div>
            <p
              className="mt-5 max-w-md text-[15px] leading-7"
              style={{ fontFamily: inter, color: "rgba(255,255,255,0.62)" }}
            >
              Continuing a 55-year legacy of legal excellence. Dedicated to the
              vision of Mr. C. Nambiraj.
            </p>
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
                    className="text-[14px] transition-colors hover:text-white"
                    style={{ fontFamily: inter, color: "rgba(255,255,255,0.75)" }}
                  >
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
          © 2026 Nambiraj Law Dynasty. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
