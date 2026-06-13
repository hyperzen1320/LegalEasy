import PageHero, { PlaceholderBlock } from "@/components/PageHero";

export const metadata = {
  title: "Services — LegalEasy",
  description: "How we work a brief, from first consultation to final order.",
};

// Placeholder services — replace with the chambers' actual offerings.
const SERVICES = [
  {
    name: "Consultation & Opinion",
    blurb: "Considered, written advice on the merits and the way forward.",
  },
  {
    name: "Drafting & Filing",
    blurb: "Pleadings, petitions and applications, prepared and filed.",
  },
  {
    name: "Court Representation",
    blurb: "Appearance and argument across the relevant forums.",
  },
  {
    name: "Documentation & Due Diligence",
    blurb: "Agreements, conveyances and verification, handled end to end.",
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title={
          <>
            How we{" "}
            <span className="italic text-ink-2">work a brief.</span>
          </>
        }
        lead="From the first consultation to the final order. Edit these entries to describe the services the chambers offers."
      />

      <section className="mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-24">
        <div className="grid gap-px overflow-hidden rounded-sm border border-rule/60 bg-rule/40 md:grid-cols-2">
          {SERVICES.map((s, i) => (
            <div key={s.name} className="bg-paper p-8 md:p-10">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-[11px] tracking-[0.18em] text-brass">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-[26px] leading-tight tracking-[-0.01em] text-ink">
                  {s.name}
                </h3>
              </div>
              <p className="mt-4 font-body text-[15px] leading-7 text-ink-2">
                {s.blurb}
              </p>
              <div className="mt-6">
                <PlaceholderBlock label="Add detail" lines={2} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
