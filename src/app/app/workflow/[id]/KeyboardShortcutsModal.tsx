"use client";

import { useEffect } from "react";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["F"], label: "Fit canvas to view" },
  { keys: ["L"], label: "Lock / unlock the canvas" },
  { keys: ["M"], label: "Toggle the minimap" },
  { keys: ["+"], label: "Zoom in" },
  { keys: ["−"], label: "Zoom out" },
  { keys: ["?"], label: "Open this help panel" },
  { keys: ["Esc"], label: "Close panels and composers" },
];

export default function KeyboardShortcutsModal({
  onClose,
}: {
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(10,17,36,0.55)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-[440px] overflow-y-auto rounded-2xl"
        style={{
          backgroundColor: "var(--color-app-paper)",
          boxShadow:
            "0 32px 64px -16px rgba(10,17,36,0.40), 0 0 0 1px rgba(10,17,36,0.06)",
          animation:
            "le-pop 220ms cubic-bezier(0.2, 0.7, 0.1, 1) both",
        }}
      >
        <div className="px-6 pt-5 pb-3">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-copper-deep)",
            }}
          >
            Canvas
          </div>
          <h3
            className="mt-1 text-[22px] font-semibold tracking-tight"
            style={{
              fontFamily: "var(--font-crimson), Georgia, serif",
              color: "var(--color-app-ink)",
            }}
          >
            Keyboard shortcuts
          </h3>
        </div>

        <div className="px-6 pb-5">
          <ul className="space-y-2">
            {SHORTCUTS.map((s) => (
              <li
                key={s.keys.join("+")}
                className="flex items-center justify-between rounded-lg px-3 py-2.5"
                style={{ backgroundColor: "var(--color-app-canvas-2)" }}
              >
                <span
                  className="text-[13px]"
                  style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    color: "var(--color-app-fg-soft)",
                  }}
                >
                  {s.label}
                </span>
                <span className="flex items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="rounded border px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                      style={{
                        fontFamily: "var(--font-dm-mono), monospace",
                        backgroundColor: "var(--color-app-paper)",
                        borderColor: "var(--color-app-edge)",
                        color: "var(--color-app-ink)",
                        boxShadow:
                          "0 1px 0 var(--color-app-edge), inset 0 -1px 0 rgba(10,17,36,0.04)",
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="flex items-center justify-end px-6 py-4"
          style={{
            backgroundColor: "var(--color-app-canvas-2)",
            borderTop: "1px solid var(--color-app-edge-soft)",
          }}
        >
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-[13px] font-semibold"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              backgroundColor: "var(--color-app-ink)",
              color: "var(--color-app-ivory)",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
