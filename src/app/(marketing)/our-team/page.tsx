import Link from "next/link";
import HeritageHero from "@/components/HeritageHero";
import Reveal from "@/components/Reveal";

// NAMBIRAJ LAW DYNASTY — Our Team. Navy masthead, then the bench as portrait
// cards. The portraits are elegant gold-monogram placeholders on a navy
// gradient — a real headshot drops straight into the same tile when ready.
// Names, roles and bios are placeholder copy for the chambers to replace.

export const metadata = {
  title: "Our Team — Nambiraj Law Dynasty",
  description:
    "The advocates and counsel who carry the Nambiraj Law Dynasty forward — specialists across litigation, corporate, property and advisory practice.",
};

const playfair = "var(--font-playfair), Georgia, serif";
const inter = "var(--font-inter), system-ui, sans-serif";

type Member = {
  initials: string;
  name: string;
  role: string;
  bio: string;
  focus: string[];
};

const TEAM: Member[] = [
  {
    initials: "NS",
    name: "N. Sureka",
    role: "Managing Partner · Senior Advocate",
    bio: "Successor to the dynasty's founder, leading the firm's litigation and advisory practice with over two decades at the Bar.",
    focus: ["Litigation", "Advisory"],
  },
  {
    initials: "RM",
    name: "Adv. R. Menon",
    role: "Partner · Litigation & Disputes",
    bio: "Trial and appellate advocacy across civil and commercial matters, with a record of hard-fought, thoroughly prepared cases.",
    focus: ["Trial", "Arbitration"],
  },
  {
    initials: "KI",
    name: "Adv. K. Iyer",
    role: "Partner · Corporate, Tax & Regulatory",
    bio: "Advises businesses and HNIs on structuring, compliance and tax disputes — from incorporation through assessment and appeal.",
    focus: ["Corporate", "Tax"],
  },
  {
    initials: "SN",
    name: "Adv. S. Nair",
    role: "Senior Associate · Property & Conveyancing",
    bio: "Title due diligence, conveyancing and land disputes — end-to-end property practice with meticulous documentation.",
    focus: ["Property", "Due Diligence"],
  },
  {
    initials: "MP",
    name: "Adv. M. Pillai",
    role: "Associate · Criminal Defence",
    bio: "Defence strategy and bail-to-trial representation, with a steady focus on protecting constitutional rights.",
    focus: ["Criminal", "Bail"],
  },
  {
    initials: "AK",
    name: "Adv. A. Krishnan",
    role: "Of Counsel · Advisory & Opinions",
    bio: "Reasoned written opinions on contentious questions of law, regulatory exposure and litigation risk.",
    focus: ["Opinions", "Advisory"],
  },
];

export default function OurTeamPage() {
  return (
    <>
      <HeritageHero
        eyebrow="The People"
        title="Our Team"
        lead="The advocates and counsel who carry the Nambiraj Law Dynasty forward — each a specialist, all held to the same standard of diligence and discretion."
      />

      <section
        style={{
          backgroundColor:
            "color-mix(in oklch, var(--color-heritage-stone) 35%, white)",
        }}
      >
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-24">
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((m, i) => (
              <Reveal key={m.name} delay={(i % 3) * 0.06} className="h-full">
                <TeamCard member={m} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section
        className="border-t"
        style={{
          borderColor: "var(--color-heritage-border)",
          backgroundColor:
            "color-mix(in oklch, var(--color-heritage-stone) 35%, white)",
        }}
      >
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10 md:py-24">
          <Reveal>
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2
                  className="text-[30px] tracking-[-0.01em] md:text-[40px]"
                  style={{
                    fontFamily: playfair,
                    color: "var(--color-heritage-navy)",
                  }}
                >
                  Work with our bench.
                </h2>
                <p
                  className="mt-3 max-w-xl text-[16px] leading-7"
                  style={{
                    fontFamily: inter,
                    color: "var(--color-heritage-muted)",
                  }}
                >
                  Tell us about your matter and we&rsquo;ll route it to the right
                  counsel within the firm.
                </p>
              </div>
              <Link
                href="/contact"
                className="shrink-0 px-8 py-4 text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-90"
                style={{
                  fontFamily: inter,
                  fontWeight: 600,
                  backgroundColor: "var(--color-heritage-navy)",
                  color: "#ffffff",
                }}
              >
                Request a Consultation
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function TeamCard({ member }: { member: Member }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden border border-[var(--color-heritage-border)] bg-white transition-shadow duration-300 hover:shadow-[0_34px_64px_-34px_rgba(10,16,28,0.5)]">
      {/* Monogram portrait */}
      <div
        className="relative aspect-[4/5] w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, var(--color-heritage-navy) 0%, #0b1422 100%)",
        }}
      >
        {/* faint gold inset frame */}
        <div
          aria-hidden
          className="absolute inset-5 border transition-[inset] duration-300 group-hover:inset-4"
          style={{ borderColor: "rgba(212,175,90,0.35)" }}
        />
        {/* soft top sheen */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, rgba(212,175,90,0.12), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-[58px] tracking-[0.06em] transition-transform duration-300 group-hover:scale-105"
            style={{ fontFamily: playfair, color: "var(--color-heritage-gold)" }}
          >
            {member.initials}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-6">
        <h3
          className="text-[22px] tracking-[-0.01em]"
          style={{
            fontFamily: playfair,
            color: "var(--color-heritage-navy)",
          }}
        >
          {member.name}
        </h3>
        <div
          className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{
            fontFamily: inter,
            color: "var(--color-heritage-gold-deep)",
          }}
        >
          {member.role}
        </div>
        <p
          className="mt-3 text-[14px] leading-7"
          style={{ fontFamily: inter, color: "var(--color-heritage-muted)" }}
        >
          {member.bio}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {member.focus.map((f) => (
            <span
              key={f}
              className="border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]"
              style={{
                fontFamily: inter,
                borderColor: "var(--color-heritage-border)",
                color: "var(--color-heritage-navy)",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
