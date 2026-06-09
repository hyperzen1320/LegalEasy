import Link from "next/link";
import MobileMenu from "./MobileMenu";

const NAV = [
  { name: "Cabinet", href: "#cabinet" },
  { name: "A Day", href: "#chambers" },
  { name: "Press", href: "#export" },
  { name: "Prospectus", href: "#pricing" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule/60 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-4 md:px-10">
        <Link href="/" className="group flex items-center gap-3">
          <Monogram />
          <div className="leading-none">
            <div className="font-display text-[26px] font-medium tracking-[-0.01em] text-ink">
              LegalEasy
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-brass-deep">
              Advocate · Edition
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {NAV.map((item, i) => (
            <Link
              key={item.name}
              href={item.href}
              className="group relative font-body text-[15px] text-ink-2 transition-colors hover:text-ink"
            >
              <span className="mr-2 align-middle font-mono text-[10px] tracking-[0.18em] text-brass">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="align-middle">{item.name}</span>
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-brass transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="font-body text-[15px] text-ink-2 transition-colors hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="#access"
            className="group inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-ink-2"
          >
            Request Access
            <span className="text-brass transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        <MobileMenu nav={NAV} />
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent" />
    </header>
  );
}

function Monogram() {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      aria-hidden
      className="shrink-0 text-ink"
    >
      <rect
        x="1"
        y="1"
        width="36"
        height="36"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect
        x="4"
        y="4"
        width="30"
        height="30"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.5"
      />
      <path
        d="M11 10 L11 28 L28 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
      <circle cx="28" cy="10" r="2.2" fill="#b68b3c" />
    </svg>
  );
}
