import Link from "next/link";
import Logo from "@/components/Logo";

// Company Home. A scaffold in the house editorial style — hero, a short
// intro, teaser cards into the company pages, a nod to the product, and a
// closing call to action. Copy is placeholder; drop the real words in.

export const metadata = {
  title: "LegalEasy — Counsel, in order.",
  description:
    "An advocate's chambers, set in order — and the software that keeps it that way.",
};

const PAGES = [
  {
    name: "About Us",
    href: "/about",
    blurb: "Who we are, the bench we keep, and the standard we hold.",
  },
  {
    name: "Practicing Area",
    href: "/practicing-area",
    blurb: "The matters we take up and the courts we appear before.",
  },
  {
    name: "Services",
    href: "/services",
    blurb: "How we work a brief — from first consultation to final order.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full opacity-[0.18]"
          style={{
            background:
              "radial-gradient(closest-side, rgba(182,139,60,0.6), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-[1320px] px-6 py-24 md:px-10 md:py-32">
          <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-7">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass-deep">
                <span className="mr-3 inline-block h-px w-8 bg-brass align-middle" />
                Advocate Chambers · Est. MMXXVI
              </div>
              <h1 className="mt-6 font-display text-[52px] font-medium leading-[1.02] tracking-[-0.03em] text-ink md:text-[92px]">
                Counsel,{" "}
                <span className="italic text-ink-2">in order.</span>
              </h1>
              <p className="mt-7 max-w-xl font-body text-[18px] leading-8 text-ink-2">
                {/* PLACEHOLDER — your firm's one-line positioning goes here. */}
                A short, confident introduction to the chambers — the work you
                take on, the courts you appear before, and the standard you
                hold every brief to.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/contact"
                  className="group inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-ink-2"
                >
                  Get in touch
                  <span className="text-brass transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
                <Link
                  href="/product"
                  className="font-body text-[15px] text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  Explore the LegalEasy product →
                </Link>
              </div>
            </div>

            <div className="hidden justify-center md:col-span-5 md:flex">
              <div className="flex h-64 w-64 items-center justify-center rounded-full border border-rule/50 bg-paper-2/40">
                <Logo size={150} priority />
              </div>
            </div>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent" />
      </section>

      {/* Page teasers */}
      <section className="mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {PAGES.map((p, i) => (
            <Link
              key={p.href}
              href={p.href}
              className="group flex flex-col justify-between border border-rule/60 bg-paper-2/30 p-8 transition-colors hover:border-ink/40 hover:bg-paper-2/60"
            >
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-4 font-display text-[28px] leading-tight tracking-[-0.01em] text-ink">
                  {p.name}
                </div>
                <p className="mt-3 font-body text-[15px] leading-7 text-ink-soft">
                  {p.blurb}
                </p>
              </div>
              <div className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-brass-deep transition-transform duration-200 group-hover:translate-x-1">
                Read more →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Closing band */}
      <section className="border-t border-rule/40 bg-paper-2/40">
        <div className="mx-auto flex max-w-[1320px] flex-col items-start gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:px-10 md:py-20">
          <h2 className="font-display text-[32px] leading-tight tracking-[-0.01em] text-ink md:text-[44px]">
            Have a matter to discuss?
          </h2>
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-paper transition-colors hover:bg-ink-2"
          >
            Contact the chambers
            <span className="text-brass transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
