import PageHero, { PlaceholderBlock } from "@/components/PageHero";

export const metadata = {
  title: "Practicing Area — LegalEasy",
  description: "The matters we take up and the courts we appear before.",
};

// Placeholder practice areas — rename / add / remove to match the chambers.
const AREAS = [
  "Civil Litigation",
  "Criminal Defence",
  "Family & Matrimonial",
  "Property & Conveyancing",
  "Corporate & Commercial",
  "Arbitration",
];

export default function PracticingAreaPage() {
  return (
    <>
      <PageHero
        eyebrow="Practicing Area"
        title="The matters we take up."
        lead="The areas of law the chambers practises in, and the forums it appears before. Edit the cards below to match your own areas of practice."
      />

      <section className="mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {AREAS.map((area, i) => (
            <div
              key={area}
              className="flex flex-col border border-rule/60 bg-paper-2/30 p-8"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="mt-4 font-display text-[26px] leading-tight tracking-[-0.01em] text-ink">
                {area}
              </div>
              <div className="mt-5">
                <PlaceholderBlock label="Describe this area" lines={3} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
