// Placeholder for the Senior Desk module. The sidebar entry exists so
// users can find the surface; content will be wired up once the spec
// (reminders, internal messaging, advocate coordination) is finalised.

export default function SeniorDeskPage() {
  return (
    <div className="px-10 py-8">
      <div className="mx-auto max-w-[1100px]">
        <ComingSoon
          eyebrow="Internal coordination"
          title="Senior Desk"
          body="Senior-junior coordination — personal reminders, assignable nudges, and a private message thread per advocate. Spec is being finalised; the desk is being polished."
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
            <path
              d="M7 4h6l-2 4H9l-2-4z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M10 8v6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M6 14h8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <rect
              x="14"
              y="11"
              width="7"
              height="9"
              rx="1.2"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M16 15h3M16 17.5h3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
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
          The desk lamp's not on yet.
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
