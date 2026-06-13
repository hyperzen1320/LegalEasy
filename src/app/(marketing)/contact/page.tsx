import PageHero from "@/components/PageHero";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact — LegalEasy",
  description: "Get in touch with the chambers.",
};

// Office details — placeholders. Replace with the chambers' real address,
// phone and hours.
const DETAILS = [
  { label: "Email", value: "chambers@legaleasy.in" },
  { label: "Phone", value: "+91 00000 00000" },
  { label: "Chambers", value: "Your address, line one" },
  { label: "", value: "City · State · PIN" },
  { label: "Hours", value: "Mon – Sat · 10:00 – 18:00" },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Get in touch."
        lead="Reach the chambers with the details below, or send a note and we'll respond. Replace the contact details with your own."
      />

      <section className="mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-24">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          {/* Details */}
          <div className="md:col-span-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass-deep">
              The chambers
            </div>
            <dl className="mt-8 space-y-6">
              {DETAILS.map((d, i) => (
                <div key={i} className="border-b border-rule/40 pb-4">
                  {d.label ? (
                    <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                      {d.label}
                    </dt>
                  ) : null}
                  <dd className="mt-1 font-body text-[17px] text-ink">
                    {d.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Form */}
          <div className="md:col-span-7">
            <div className="border border-rule/60 bg-paper-2/30 p-8 md:p-10">
              <h2 className="font-display text-[28px] leading-tight tracking-[-0.01em] text-ink">
                Send a message
              </h2>
              <p className="mt-2 font-body text-[14px] leading-7 text-ink-soft">
                This opens your email app, pre-filled. Wire it to a proper
                endpoint whenever you&rsquo;re ready.
              </p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
