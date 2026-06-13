import Link from "next/link";
import Logo from "./Logo";

const COLS: { title: string; links: { name: string; href: string }[] }[] = [
  {
    title: "Company",
    links: [
      { name: "Home", href: "/" },
      { name: "About Us", href: "/about" },
      { name: "Practicing Area", href: "/practicing-area" },
      { name: "Services", href: "/services" },
    ],
  },
  {
    title: "Product",
    links: [
      { name: "Overview", href: "/product" },
      { name: "Pricing", href: "/product" },
      { name: "Document Export", href: "/product" },
      { name: "Sign in", href: "/login" },
    ],
  },
  {
    title: "Chambers",
    links: [
      { name: "Contact", href: "/contact" },
      { name: "Press", href: "#" },
      { name: "Careers", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Terms", href: "#" },
      { name: "Privacy", href: "#" },
      { name: "Compliance", href: "#" },
      { name: "Status", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-rule/60 bg-paper-2/40">
      <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <Logo size={46} />
              <div className="font-display text-[44px] leading-none tracking-[-0.02em] text-ink">
                LegalEasy
              </div>
            </div>
            <p className="mt-5 max-w-md font-body text-[15px] leading-7 text-ink-soft">
              An advocate office, set in order. Built in India for the way
              matters actually move — from cause-list mornings to senior-desk
              briefings, to filings at midnight.
            </p>
            <div className="mt-8 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-brass-deep">
              <span className="inline-block h-px w-10 bg-brass align-middle" />
              <span>Made in India</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-4">
            {COLS.map((col) => (
              <div key={col.title}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-deep">
                  {col.title}
                </div>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.name}>
                      <Link
                        href={l.href}
                        className="font-body text-[14px] text-ink-2 transition-colors hover:text-ink"
                      >
                        {l.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-rule/40 pt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-brass-deep">Vol. I · No. 01</span>
            <span className="text-rule">/</span>
            <span>Bengaluru · India</span>
            <span className="text-rule">/</span>
            <span>April 2026</span>
          </div>
          <div>© 2026 LegalEasy. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
