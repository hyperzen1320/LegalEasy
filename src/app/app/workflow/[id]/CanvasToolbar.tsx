"use client";

// Custom canvas controls — replaces React Flow's default <Controls>
// because the unlabeled icons confused users. This is a designed pill
// bar with labelled buttons, a zoom popover with a slider, a MiniMap
// toggle (the minimap is otherwise always-visible and visually noisy),
// and a help button that opens the keyboard shortcuts modal.

import { useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";

type Props = {
  showMinimap: boolean;
  onToggleMinimap: () => void;
  locked: boolean;
  onToggleLock: () => void;
  onOpenHelp: () => void;
  // Incrementing counter — every change triggers a brief flash+shake on
  // the Lock pill so the user can see WHERE the block came from when
  // they try to edit a locked canvas.
  lockPulseSig?: number;
};

export default function CanvasToolbar({
  showMinimap,
  onToggleMinimap,
  locked,
  onToggleLock,
  onOpenHelp,
  lockPulseSig = 0,
}: Props) {
  const rf = useReactFlow();
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Triggered by lockPulseSig. We use a counter so re-mounting the
  // animation key forces it to replay even if the user keeps clicking
  // on the locked canvas in quick succession.
  const [pulseCount, setPulseCount] = useState(0);
  useEffect(() => {
    if (lockPulseSig > 0) {
      setPulseCount((c) => c + 1);
    }
  }, [lockPulseSig]);

  // Sync displayed zoom % with React Flow's actual viewport.
  useEffect(() => {
    const sync = () => setZoom(Math.round(rf.getZoom() * 100));
    sync();
    const t = setInterval(sync, 250);
    return () => clearInterval(t);
  }, [rf]);

  // Click-outside to close the zoom popover.
  useEffect(() => {
    if (!zoomOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setZoomOpen(false);
      }
    };
    window.addEventListener("mousedown", onDocClick);
    return () => window.removeEventListener("mousedown", onDocClick);
  }, [zoomOpen]);

  // Keyboard shortcuts: F = fit, L = lock, +/- = zoom, M = minimap, ? = help.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea/contenteditable.
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "f":
        case "F":
          rf.fitView({ duration: 350, padding: 0.15 });
          break;
        case "l":
        case "L":
          onToggleLock();
          break;
        case "m":
        case "M":
          onToggleMinimap();
          break;
        case "+":
        case "=":
          rf.zoomIn({ duration: 200 });
          break;
        case "-":
        case "_":
          rf.zoomOut({ duration: 200 });
          break;
        case "?":
          onOpenHelp();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rf, onToggleLock, onToggleMinimap, onOpenHelp]);

  return (
    <div
      ref={wrapperRef}
      className="absolute bottom-5 left-5 z-30 flex items-center"
      style={{
        backgroundColor: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(10px)",
        borderRadius: 999,
        padding: 4,
        boxShadow:
          "0 12px 28px -10px rgba(10,17,36,0.22), 0 0 0 1px rgba(10,17,36,0.06)",
      }}
    >
      <ToolButton
        label="Zoom"
        sublabel={`${zoom}%`}
        onClick={() => setZoomOpen((v) => !v)}
        active={zoomOpen}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            cx="11"
            cy="11"
            r="6"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M11 8v6M8 11h6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M16 16l5 5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </ToolButton>

      <Divider />

      <ToolButton
        label="Fit"
        sublabel="F"
        onClick={() => rf.fitView({ duration: 350, padding: 0.15 })}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </ToolButton>

      <Divider />

      <ToolButton
        label="Lock"
        sublabel="L"
        onClick={onToggleLock}
        active={locked}
        pulseKey={pulseCount}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <rect
            x="5"
            y="11"
            width="14"
            height="9"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          {locked ? (
            <path
              d="M8 11V8a4 4 0 1 1 8 0v3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M8 11V8a4 4 0 0 1 7-2.65"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          )}
        </svg>
      </ToolButton>

      <Divider />

      <ToolButton
        label="Map"
        sublabel="M"
        onClick={onToggleMinimap}
        active={showMinimap}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M9 5l-6 2v12l6-2 6 2 6-2V5l-6 2-6-2zM9 5v12M15 7v12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </ToolButton>

      <Divider />

      <ToolButton label="Help" sublabel="?" onClick={onOpenHelp}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M9.5 9.2a2.5 2.5 0 1 1 3.7 2.2c-.7.4-1.2 1-1.2 1.8v.3M12 17v.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </ToolButton>

      {zoomOpen ? (
        <div
          className="absolute bottom-full left-0 mb-2 rounded-xl p-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.98)",
            boxShadow:
              "0 18px 36px -12px rgba(10,17,36,0.30), 0 0 0 1px rgba(10,17,36,0.06)",
            minWidth: 220,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                color: "var(--color-app-fg-muted)",
              }}
            >
              Zoom
            </span>
            <span
              className="tabular-nums text-[12px] font-semibold"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                color: "var(--color-app-ink)",
              }}
            >
              {zoom}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={zoom}
            onChange={(e) => {
              const v = Number(e.target.value);
              setZoom(v);
              const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
              rf.zoomTo(v / 100, { duration: 0 });
              void center;
            }}
            className="mt-3 w-full"
            style={{ accentColor: "var(--color-app-copper)" }}
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              onClick={() => rf.zoomOut({ duration: 200 })}
              className="rounded px-3 py-1 text-[12px] font-semibold"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                backgroundColor: "var(--color-app-canvas-2)",
                color: "var(--color-app-ink)",
              }}
            >
              −
            </button>
            <button
              onClick={() => rf.zoomTo(1, { duration: 200 })}
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                color: "var(--color-app-fg-muted)",
              }}
            >
              Reset
            </button>
            <button
              onClick={() => rf.zoomIn({ duration: 200 })}
              className="rounded px-3 py-1 text-[12px] font-semibold"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                backgroundColor: "var(--color-app-canvas-2)",
                color: "var(--color-app-ink)",
              }}
            >
              +
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToolButton({
  label,
  sublabel,
  active,
  onClick,
  children,
  pulseKey,
}: {
  label: string;
  sublabel: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  // When pulseKey changes, the button briefly scales up + flashes
  // danger-red. Used by the Lock button to draw the user's eye when
  // they try to edit a locked canvas. Keyed re-mount of the inner
  // span replays the CSS animation cleanly.
  pulseKey?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center gap-0.5 rounded-full px-3 py-2 transition-colors"
      style={{
        fontFamily: "var(--font-manrope), sans-serif",
        backgroundColor: active ? "var(--color-app-ink)" : "transparent",
        color: active ? "var(--color-app-ivory)" : "var(--color-app-ink)",
        minWidth: 56,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "var(--color-app-canvas-2)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
      title={`${label} (${sublabel})`}
    >
      {pulseKey && pulseKey > 0 ? (
        <span
          key={pulseKey}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            border: "2px solid var(--color-app-copper)",
            animation: "tb-lock-pulse 720ms ease-out",
          }}
        />
      ) : null}
      <style>{`
        @keyframes tb-lock-pulse {
          0% {
            opacity: 0.95;
            transform: scale(0.9);
            box-shadow: 0 0 0 0 rgba(197, 133, 58, 0.55);
          }
          60% {
            opacity: 0.7;
            transform: scale(1.18);
            box-shadow: 0 0 0 14px rgba(197, 133, 58, 0);
          }
          100% {
            opacity: 0;
            transform: scale(1.28);
            box-shadow: 0 0 0 18px rgba(197, 133, 58, 0);
          }
        }
      `}</style>
      {children}
      <span
        className="text-[9px] uppercase tracking-[0.16em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: active
            ? "rgba(245,235,214,0.65)"
            : "var(--color-app-fg-muted)",
        }}
      >
        {label}
      </span>
    </button>
  );
}

function Divider() {
  return (
    <span
      className="mx-0.5 h-7 w-px"
      style={{ backgroundColor: "var(--color-app-edge-soft)" }}
    />
  );
}
