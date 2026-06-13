import PageHero, { PlaceholderBlock } from "@/components/PageHero";

export const metadata = {
  title: "About Us — LegalEasy",
  description: "About the chambers.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title={
          <>
            The chambers,{" "}
            <span className="italic text-ink-2">and the bench it keeps.</span>
          </>
        }
        lead="A short introduction to who you are, when the practice was founded, and the principles it runs on. Replace this lead with your own words."
      />

      <section className="mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-24">
        {/* Intro split */}
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <h2 className="font-display text-[30px] leading-tight tracking-[-0.01em] text-ink md:text-[38px]">
              Our story
            </h2>
          </div>
          <div className="md:col-span-7">
            <PlaceholderBlock label="About — story" lines={5} />
            <p className="mt-6 font-body text-[15px] italic leading-7 text-ink-soft">
              Drop the firm&rsquo;s history, founding partners and ethos here.
            </p>
          </div>
        </div>

        {/* Principles grid */}
        <div className="mt-20 border-t border-rule/40 pt-16">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass-deep">
            What we hold to
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {["Diligence", "Discretion", "Candour"].map((t) => (
              <div
                key={t}
                className="border border-rule/60 bg-paper-2/30 p-8"
              >
                <div className="font-display text-[24px] tracking-[-0.01em] text-ink">
                  {t}
                </div>
                <div className="mt-4">
                  <PlaceholderBlock label="Principle" lines={3} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
