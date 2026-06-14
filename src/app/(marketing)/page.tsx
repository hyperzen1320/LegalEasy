import Link from "next/link";
import Image from "next/image";

// NAMBIRAJ LAW DYNASTY — company home, a close replica of the reference:
// hero over the library photo, the "Phenomenon" split, the practising-areas
// trio, and the modern-environment split. Playfair Display + Inter on the
// heritage navy / gold / paper palette.

export const metadata = {
  title: "Nambiraj Law Dynasty — Justice is our lineage",
  description:
    "Continuing the legacy of Mr. C. Nambiraj — timeless ethical values with modern legal infrastructure.",
};

const playfair = "var(--font-playfair), Georgia, serif";
const inter = "var(--font-inter), system-ui, sans-serif";
const NAVY = "var(--color-heritage-navy)";
const GOLD = "var(--color-heritage-gold)";
const GOLD_DEEP = "var(--color-heritage-gold-deep)";
const PAPER = "var(--color-heritage-paper)";

export default function Home() {
  return (
    <>
      <Hero />
      <Phenomenon />
      <PracticingAreas />
      <ModernEnvironment />
    </>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero() {
  return (
    <section className="relative flex min-h-[640px] items-center overflow-hidden md:min-h-[88vh]">
      <Image
        src="/hero-library.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* darkening so the type sits cleanly */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(10,16,28,0.86) 0%, rgba(10,16,28,0.62) 45%, rgba(10,16,28,0.30) 100%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[1320px] px-6 py-24 md:px-10">
        <div className="max-w-2xl">
          <div
            className="text-[14px] italic tracking-[0.28em]"
            style={{ fontFamily: inter, color: GOLD }}
          >
            ESTABLISHED 1969
          </div>
          <h1
            className="mt-6 text-[46px] leading-[1.04] tracking-[-0.01em] text-white sm:text-[64px] md:text-[78px]"
            style={{ fontFamily: playfair, fontWeight: 500 }}
          >
            Justice is not just a profession, it is our{" "}
            <span className="italic">lineage.</span>
          </h1>
          <p
            className="mt-7 max-w-xl text-[17px] leading-8"
            style={{ fontFamily: inter, color: "rgba(255,255,255,0.78)" }}
          >
            Continuing the legacy of Mr. C. Nambiraj, we blend timeless ethical
            values with modern legal infrastructure to serve the under-privileged
            and the visionary alike.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/contact"
              className="px-7 py-4 text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-90"
              style={{
                fontFamily: inter,
                fontWeight: 600,
                backgroundColor: GOLD,
                color: "#ffffff",
              }}
            >
              Consult Our Dynasty
            </Link>
            <Link
              href="/about"
              className="border px-7 py-4 text-[12px] uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10"
              style={{ fontFamily: inter, fontWeight: 600, borderColor: "rgba(255,255,255,0.5)" }}
            >
              Firm History
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── The Phenomenon ──────────────────── */

function Phenomenon() {
  return (
    <section style={{ backgroundColor: PAPER }}>
      <div className="mx-auto grid max-w-[1320px] gap-12 px-6 py-20 md:grid-cols-12 md:gap-16 md:px-10 md:py-28">
        {/* Image + stat block */}
        <div className="md:col-span-6">
          {/* Mr. C. Nambiraj's portrait fills the frame (object-cover). The
              frame is held to 85% of the column so it reads a touch smaller,
              with the gold "years of practice" plate overhanging its corner. */}
          <div className="relative mx-auto w-[85%] md:mx-0">
            <div
              className="relative aspect-[4/5] w-full overflow-hidden"
              style={{ backgroundColor: "#e7ded0" }}
            >
              <Image
                src="/nambiraj.jpg"
                alt="Mr. C. Nambiraj"
                fill
                sizes="(min-width: 768px) 22vw, 47vw"
                className="object-cover object-center"
              />
            </div>
            <div
              className="absolute -bottom-8 right-6 flex h-36 w-56 flex-col items-start justify-end p-6 md:right-[-2rem]"
              style={{ backgroundColor: GOLD }}
            >
              <div className="text-[40px] leading-none text-white" style={{ fontFamily: playfair }}>
                55+
              </div>
              <div
                className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/90"
                style={{ fontFamily: inter }}
              >
                Years of Practice
              </div>
            </div>
          </div>
        </div>

        {/* Text — nudged down so the portrait rises above the heading,
            matching the reference composition. */}
        <div className="md:col-span-6 md:pl-4 md:pt-12">
          <h2
            className="text-[34px] leading-[1.12] tracking-[-0.01em] md:text-[44px]"
            style={{ fontFamily: playfair, color: NAVY }}
          >
            The Phenomenon of
            <br />
            Mr. C. Nambiraj
          </h2>
          <p
            className="mt-6 text-[16px] leading-7"
            style={{ fontFamily: inter, color: "color-mix(in oklch, var(--color-heritage-navy) 80%, white)" }}
          >
            He was more than a lawyer; he was an intellectual legend who entered
            practice in 1969 and focused on the welfare of the under-privileged
            with absolute grace and humility.
          </p>
          <blockquote
            className="mt-6 border-l-2 pl-5 text-[16px] italic leading-7"
            style={{
              fontFamily: inter,
              borderColor: GOLD,
              color: "color-mix(in oklch, var(--color-heritage-navy) 78%, white)",
            }}
          >
            &ldquo;A good lawyer throws himself on your part so heartily, that
            makes him win in all situations.&rdquo;
          </blockquote>
          <p
            className="mt-6 text-[16px] leading-7"
            style={{ fontFamily: inter, color: "color-mix(in oklch, var(--color-heritage-navy) 80%, white)" }}
          >
            Today, N. Sureka leads a team of talented legal professionals, guiding
            the dynasty with the same principles of ethical practice and
            resourcefulness.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── Practicing Areas ─────────────────── */

const AREAS = [
  {
    name: "Civil Litigation",
    blurb:
      "Defending rights and resolving disputes with the same tenacity that built our dynasty.",
    icon: <span style={{ fontFamily: playfair, fontSize: 22 }}>§</span>,
  },
  {
    name: "Governmental Affairs",
    blurb:
      "Navigating complex regulatory landscapes with decades of institutional knowledge.",
    icon: <CourthouseIcon />,
  },
  {
    name: "Business Law",
    blurb:
      "Practical knowledge and legal foresight for modern enterprises and startups alike.",
    icon: <ScalesIcon />,
  },
];

function PracticingAreas() {
  return (
    <section style={{ backgroundColor: "color-mix(in oklch, var(--color-heritage-stone) 45%, white)" }}>
      <div className="mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div
              className="text-[12px] uppercase tracking-[0.24em]"
              style={{ fontFamily: inter, color: GOLD_DEEP }}
            >
              Expertise
            </div>
            <h2
              className="mt-3 text-[34px] tracking-[-0.01em] md:text-[44px]"
              style={{ fontFamily: playfair, color: NAVY }}
            >
              Practicing Areas
            </h2>
          </div>
          <Link
            href="/practicing-area"
            className="text-[12px] uppercase tracking-[0.18em] underline-offset-4 hover:underline"
            style={{ fontFamily: inter, fontWeight: 600, color: NAVY }}
          >
            View All Domains
          </Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {AREAS.map((a) => (
            <div
              key={a.name}
              className="group border border-[var(--color-heritage-border)] bg-white p-8 transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:border-[var(--color-heritage-navy)] hover:bg-[var(--color-heritage-navy)] hover:shadow-[0_34px_60px_-32px_rgba(10,16,28,0.55)]"
            >
              <div
                className="flex h-12 w-12 items-center justify-center bg-[color-mix(in_oklch,var(--color-heritage-gold)_20%,white)] text-[var(--color-heritage-gold-deep)] transition-colors duration-300 group-hover:bg-[var(--color-heritage-gold)] group-hover:text-[var(--color-heritage-navy)]"
              >
                {a.icon}
              </div>
              <h3
                className="mt-6 text-[24px] tracking-[-0.01em] text-[var(--color-heritage-navy)] transition-colors duration-300 group-hover:text-white"
                style={{ fontFamily: playfair }}
              >
                {a.name}
              </h3>
              <p
                className="mt-3 text-[15px] leading-7 text-[var(--color-heritage-muted)] transition-colors duration-300 group-hover:text-white/75"
                style={{ fontFamily: inter }}
              >
                {a.blurb}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── A Modern Learning Environment ─────────────── */

const BULLETS = [
  "Holistic Frameworks",
  "Mentoring Relationships",
  "Exclusive Legal Resources",
];

function ModernEnvironment() {
  return (
    <section style={{ backgroundColor: PAPER }}>
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-6 py-20 md:grid-cols-12 md:gap-16 md:px-10 md:py-28">
        <div className="md:col-span-5">
          <h2
            className="text-[34px] leading-[1.12] tracking-[-0.01em] md:text-[44px]"
            style={{ fontFamily: playfair, color: NAVY }}
          >
            A Modern Learning Environment
          </h2>
          <p
            className="mt-6 text-[16px] leading-7"
            style={{ fontFamily: inter, color: "color-mix(in oklch, var(--color-heritage-navy) 78%, white)" }}
          >
            We invest in technology and infrastructure to collaborate effectively
            while maintaining the highest standards of publication and research.
          </p>
          <ul className="mt-8 space-y-4">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GOLD }} />
                <span
                  className="text-[13px] uppercase tracking-[0.16em]"
                  style={{ fontFamily: inter, fontWeight: 600, color: NAVY }}
                >
                  {b}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-7">
          <div className="relative aspect-[2/1] w-full overflow-hidden">
            <Image
              src="/modern-office.jpg"
              alt="Modern office"
              fill
              sizes="(min-width: 768px) 55vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CourthouseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 9l9-5 9 5M5 9v9M19 9v9M3 21h18M9 12v5M12 12v5M15 12v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScalesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4v16M7 20h10M5 7h14M5 7l-2.5 6a3 3 0 0 0 5 0L5 7zM19 7l-2.5 6a3 3 0 0 0 5 0L19 7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
