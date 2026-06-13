// Shared masthead for the company pages (About / Practicing Area / Services
// / Contact) — heritage theme: Playfair eyebrow rule + display title, Inter
// lead, on the navy / gold / paper palette.

const playfair = "var(--font-playfair), Georgia, serif";
const inter = "var(--font-inter), system-ui, sans-serif";

export default function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className="relative overflow-hidden border-b"
      style={{ borderColor: "var(--color-heritage-border)" }}
    >
      <div className="relative mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-28">
        <div
          className="text-[12px] uppercase tracking-[0.24em]"
          style={{ fontFamily: inter, color: "var(--color-heritage-gold-deep)" }}
        >
          {eyebrow}
        </div>
        <h1
          className="mt-4 max-w-3xl text-[42px] leading-[1.06] tracking-[-0.01em] md:text-[68px]"
          style={{ fontFamily: playfair, fontWeight: 500, color: "var(--color-heritage-navy)" }}
        >
          {title}
        </h1>
        {lead ? (
          <p
            className="mt-6 max-w-2xl text-[18px] leading-8"
            style={{
              fontFamily: inter,
              color: "color-mix(in oklch, var(--color-heritage-navy) 78%, white)",
            }}
          >
            {lead}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

// A clearly-marked "drop your content here" block so scaffolded pages look
// intentional until the real copy lands.
export function PlaceholderBlock({
  label = "Content coming soon",
  lines = 3,
}: {
  label?: string;
  lines?: number;
}) {
  return (
    <div
      className="bg-white p-6"
      style={{ border: "1px dashed var(--color-heritage-border)" }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.22em]"
        style={{ fontFamily: inter, color: "var(--color-heritage-gold-deep)" }}
      >
        {label}
      </div>
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded-sm"
            style={{
              width: `${[92, 84, 70, 88, 60][i % 5]}%`,
              backgroundColor: "color-mix(in oklch, var(--color-heritage-stone) 70%, white)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
