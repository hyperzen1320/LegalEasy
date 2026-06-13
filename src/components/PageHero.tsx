// Shared masthead for the company pages (About / Practicing Area / Services
// / Contact). Keeps the editorial look — mono eyebrow with a brass rule, a
// large display title, an optional lead — so every page opens the same way.
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
    <section className="relative overflow-hidden border-b border-rule/40">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[460px] w-[460px] rounded-full opacity-[0.16]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(182,139,60,0.6), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-28">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass-deep">
          <span className="mr-3 inline-block h-px w-8 bg-brass align-middle" />
          {eyebrow}
        </div>
        <h1 className="mt-6 max-w-3xl font-display text-[44px] font-medium leading-[1.05] tracking-[-0.025em] text-ink md:text-[76px]">
          {title}
        </h1>
        {lead ? (
          <p className="mt-6 max-w-2xl font-body text-[18px] leading-8 text-ink-2">
            {lead}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

// A clearly-marked "drop your content here" block — so the scaffolded pages
// look intentional, not broken, until the real copy lands.
export function PlaceholderBlock({
  label = "Content coming soon",
  lines = 3,
}: {
  label?: string;
  lines?: number;
}) {
  return (
    <div className="rounded-sm border border-dashed border-rule/70 bg-paper-2/40 p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass-deep">
        {label}
      </div>
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded-sm bg-rule/30"
            style={{ width: `${[92, 84, 70, 88, 60][i % 5]}%` }}
          />
        ))}
      </div>
    </div>
  );
}
