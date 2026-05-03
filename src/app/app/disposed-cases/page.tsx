// Placeholder for the Disposed Cases module. The sidebar entry exists
// so users can find their way here; the screen content will be wired
// up once the feature spec lands.

export default function DisposedCasesPage() {
  return (
    <div className="px-10 py-8">
      <div className="mx-auto max-w-[1100px]">
        <ComingSoon
          eyebrow="Case archive"
          title="Disposed Cases"
          body="The closed-matters archive will live here — final orders, disposal dates, and a one-tap restore for matters that come back to life. Spec is being finalised; nothing to hide yet."
        />
      </div>
    </div>
  );
}

function ComingSoon({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.22em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-copper-deep)",
        }}
      >
        {eyebrow}
      </div>
      <h2
        className="mt-1 text-[40px] font-semibold tracking-tight leading-[1.1]"
        style={{
          fontFamily: "var(--font-crimson), Georgia, serif",
          color: "var(--color-app-ink)",
        }}
      >
        {title}
      </h2>
      <div
        className="mt-7 rounded-xl p-12 text-center"
        style={{
          backgroundColor: "var(--color-app-paper)",
          border: "1px dashed var(--color-app-edge)",
        }}
      >
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            backgroundColor: "var(--color-app-canvas-2)",
            color: "var(--color-app-copper-deep)",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <rect
              x="3"
              y="7"
              width="18"
              height="13"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M9 14.5l2.2 2.2L15.5 12.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3
          className="mt-5 text-[24px] font-semibold tracking-tight"
          style={{
            fontFamily: "var(--font-crimson), Georgia, serif",
            color: "var(--color-app-ink)",
          }}
        >
          Shelves are being built.
        </h3>
        <p
          className="mx-auto mt-3 max-w-md text-[14px] leading-7"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-fg-muted)",
          }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}
