import Link from "next/link";

// Editorial masthead for the LegalEasy product surface (/product, /login).
// Distinct from the NAMBIRAJ company Header — this is the product's own
// brand. Nav items deep-link into the product page's sections so they work
// from the login page too. "Sign in" is the route into the app.

const NAV = [
  { num: "01", name: "Cabinet", href: "/product#cabinet" },
  { num: "02", name: "A Day", href: "/product#chambers" },
  { num: "03", name: "Press", href: "/product#export" },
  { num: "04", name: "Prospectus", href: "/product#pricing" },
];

export default function ProductHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule/40 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-4 md:px-10">
        {/* Wordmark */}
        <Link href="/product" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center border-2 border-ink">
            <span className="font-display text-[17px] font-medium leading-none text-ink">
              L
            </span>
          </span>
          <span className="leading-none">
            <span className="block font-display text-[20px] font-medium tracking-tight text-ink">
              LegalEasy
            </span>
            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.28em] text-ink-soft">
              Advocate · Edition
            </span>
          </span>
        </Link>

        {/* Section nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="inline-flex items-baseline gap-1.5 font-body text-[15px] text-ink transition-colors hover:text-brass-deep"
            >
              <span className="font-mono text-[10px] tracking-[0.18em] text-brass">
                {item.num}
              </span>
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4 sm:gap-5">
          <Link
            href="/login"
            className="font-body text-[15px] text-ink transition-colors hover:text-brass-deep"
          >
            Sign in
          </Link>
          <Link
            href="/product#access"
            className="group inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-ink-2"
          >
            Request Access
            <span className="text-brass transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
