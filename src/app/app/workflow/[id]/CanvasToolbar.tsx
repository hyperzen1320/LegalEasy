"use client";

// Custom canvas controls — replaces React Flow's default <Controls>
// because the unlabeled icons confused users. This is a designed pill
// bar with labelled buttons, a zoom popover with a slider, a MiniMap
// toggle (the minimap is otherwise always-visible and visually noisy),
// and a help button that opens the keyboard shortcuts modal.

import { useEffect, useRef, useState } from "react";
import {
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

type Props = {
  showMinimap: boolean;
  onToggleMinimap: () => void;
  locked: boolean;
  onToggleLock: () => void;
  onOpenHelp: () => void;
  // For the Save → Data (Excel) export, which hits the server for the
  // authoritative board state, and to name the downloaded files.
  boardId: string;
  boardTitle: string;
  // Incrementing counter — every change triggers a brief flash+shake on
  // the Lock pill so the user can see WHERE the block came from when
  // they try to edit a locked canvas.
  lockPulseSig?: number;
};

type SaveKind = "png" | "pdf" | "xlsx";

export default function CanvasToolbar({
  showMinimap,
  onToggleMinimap,
  locked,
  onToggleLock,
  onOpenHelp,
  boardId,
  boardTitle,
  lockPulseSig = 0,
}: Props) {
  const rf = useReactFlow();
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [saveOpen, setSaveOpen] = useState(false);
  // Which export is in flight (disables the row + shows a spinner) and the
  // last error, shown inline under the menu rather than as a browser alert.
  const [saving, setSaving] = useState<SaveKind | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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

  // Click-outside to close the Save popover.
  useEffect(() => {
    if (!saveOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setSaveOpen(false);
      }
    };
    window.addEventListener("mousedown", onDocClick);
    return () => window.removeEventListener("mousedown", onDocClick);
  }, [saveOpen]);

  // ─── Save / export ────────────────────────────────────────────────────
  // A board can leave the canvas three ways: as a Picture (PNG) or a
  // Full page (PDF) — both captured from the rendered canvas, fitted so
  // the whole board is in frame — or as Data (Excel), pulled from the
  // server so it reflects the authoritative board state, not the view.

  function fileBase(): string {
    const slug =
      (boardTitle || "board")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "board";
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(d.getDate()).padStart(2, "0")}`;
    return `${slug}-${stamp}`;
  }

  function triggerDownload(href: string, filename: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function imageSize(
    dataUrl: string
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () =>
        reject(new Error("Couldn't read the captured image."));
      img.src = dataUrl;
    });
  }

  // Render the React Flow node layer to a PNG data URL, fitted to all
  // nodes. We capture `.react-flow__viewport` (the node layer only — the
  // minimap and controls are siblings, so they stay out of the shot) and
  // hand it a transform that frames every node.
  async function captureCanvasPng(): Promise<string> {
    const nodes = rf.getNodes();
    if (nodes.length === 0) {
      throw new Error("This board is empty — add a list or card first.");
    }
    const bounds = getNodesBounds(nodes);
    const ratio =
      bounds.height > 0 && bounds.width > 0
        ? bounds.height / bounds.width
        : 0.66;
    const imageWidth = 2000;
    const imageHeight = Math.min(
      3200,
      Math.max(800, Math.round(imageWidth * ratio))
    );
    const viewport = getViewportForBounds(
      bounds,
      imageWidth,
      imageHeight,
      0.1,
      2,
      0.08
    );
    const el = document.querySelector<HTMLElement>(".react-flow__viewport");
    if (!el) throw new Error("Couldn't find the canvas to capture.");
    const pane = document.querySelector<HTMLElement>(".react-flow");
    const background = pane
      ? getComputedStyle(pane).backgroundColor || "#f1e9d8"
      : "#f1e9d8";
    // CardPreview plays a `card-pop` entrance animation that begins at
    // opacity:0. html-to-image re-triggers CSS animations inside its
    // off-screen clone and rasterises the first frame, so cards come out
    // invisible (lists have no such animation, which is why they survive).
    // Freeze the node layer's animations/transitions for the capture so
    // every card is at its final, fully-opaque state.
    const freeze = document.createElement("style");
    freeze.textContent =
      ".react-flow__viewport, .react-flow__viewport *, .react-flow__viewport *::before, .react-flow__viewport *::after { animation: none !important; transition: none !important; }";
    document.head.appendChild(freeze);
    try {
      return await toPng(el, {
        backgroundColor: background,
        width: imageWidth,
        height: imageHeight,
        pixelRatio: 2,
        cacheBust: true,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });
    } finally {
      freeze.remove();
    }
  }

  async function doSavePng() {
    const dataUrl = await captureCanvasPng();
    triggerDownload(dataUrl, `${fileBase()}.png`);
  }

  async function doSavePdf() {
    const dataUrl = await captureCanvasPng();
    const dims = await imageSize(dataUrl);
    const landscape = dims.width >= dims.height;
    const pdf = new jsPDF({
      orientation: landscape ? "landscape" : "portrait",
      unit: "pt",
      format: "a4",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const scale = Math.min(
      (pageW - margin * 2) / dims.width,
      (pageH - margin * 2) / dims.height
    );
    const w = dims.width * scale;
    const h = dims.height * scale;
    pdf.addImage(
      dataUrl,
      "PNG",
      (pageW - w) / 2,
      (pageH - h) / 2,
      w,
      h,
      undefined,
      "FAST"
    );
    pdf.save(`${fileBase()}.pdf`);
  }

  async function doSaveXlsx() {
    const res = await fetch(
      `/api/app/boards/${boardId}/export?format=xlsx`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      let msg = "Couldn't generate the Excel export.";
      try {
        const j = (await res.json()) as { error?: string };
        if (j?.error) msg = j.error;
      } catch {
        /* non-JSON error body — keep the default message */
      }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || `${fileBase()}.xlsx`;
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function handleSave(kind: SaveKind) {
    if (saving) return;
    setSaveError(null);
    setSaving(kind);
    try {
      if (kind === "png") await doSavePng();
      else if (kind === "pdf") await doSavePdf();
      else await doSaveXlsx();
      setSaveOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setSaving(null);
    }
  }

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
      className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center sm:left-5 sm:translate-x-0"
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
        onClick={() => {
          setZoomOpen((v) => !v);
          setSaveOpen(false);
        }}
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

      <Divider />

      <ToolButton
        label="Save"
        sublabel="↓"
        onClick={() => {
          setSaveOpen((v) => !v);
          setZoomOpen(false);
          setSaveError(null);
        }}
        active={saveOpen}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M12 3v11m0 0l-4-4m4 4l4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </ToolButton>

      {saveOpen ? (
        <div
          className="absolute bottom-full right-0 mb-2 overflow-hidden rounded-xl"
          style={{
            backgroundColor: "rgba(255,255,255,0.98)",
            boxShadow:
              "0 18px 36px -12px rgba(10,17,36,0.30), 0 0 0 1px rgba(10,17,36,0.06)",
            minWidth: 256,
          }}
        >
          <div
            className="px-3 pt-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-fg-muted)",
            }}
          >
            Download board
          </div>
          <SaveOption
            title="Picture"
            sub="PNG image of the canvas"
            busy={saving === "png"}
            disabled={saving !== null}
            onClick={() => handleSave("png")}
          >
            <path
              d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="9" cy="9" r="1.4" fill="currentColor" />
          </SaveOption>
          <SaveOption
            title="Full page"
            sub="PDF, the whole board in frame"
            busy={saving === "pdf"}
            disabled={saving !== null}
            onClick={() => handleSave("pdf")}
          >
            <path
              d="M7 3h7l4 4v14H7zM14 3v4h4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="none"
            />
          </SaveOption>
          <SaveOption
            title="Data"
            sub="Excel — every card as a row"
            busy={saving === "xlsx"}
            disabled={saving !== null}
            onClick={() => handleSave("xlsx")}
            last
          >
            <path
              d="M7 3h7l4 4v14H7zM14 3v4h4M9.5 12l5 5M14.5 12l-5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
          </SaveOption>
          {saveError ? (
            <div
              className="px-3 pb-3 pt-1 text-[11px] leading-snug"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-danger)",
              }}
            >
              {saveError}
            </div>
          ) : null}
        </div>
      ) : null}

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
      className="relative flex min-w-[44px] flex-col items-center gap-0.5 rounded-full px-3 py-2 transition-colors sm:min-w-[56px]"
      style={{
        fontFamily: "var(--font-manrope), sans-serif",
        backgroundColor: active ? "var(--color-app-ink)" : "transparent",
        color: active ? "var(--color-app-ivory)" : "var(--color-app-ink)",
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
        className="hidden text-[9px] uppercase tracking-[0.16em] sm:block"
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

function SaveOption({
  title,
  sub,
  busy,
  disabled,
  onClick,
  children,
  last,
}: {
  title: string;
  sub: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed"
      style={{
        fontFamily: "var(--font-manrope), sans-serif",
        borderTop: "1px solid var(--color-app-edge-soft)",
        borderBottomLeftRadius: last ? 12 : 0,
        borderBottomRightRadius: last ? 12 : 0,
        opacity: disabled && !busy ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          e.currentTarget.style.backgroundColor =
            "var(--color-app-canvas-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: "var(--color-app-canvas-2)",
          color: "var(--color-app-ink)",
        }}
      >
        {busy ? (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <circle
              cx="12"
              cy="12"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="44"
              strokeDashoffset="14"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="0.7s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            {children}
          </svg>
        )}
      </span>
      <span className="min-w-0">
        <span
          className="block text-[13px] font-semibold"
          style={{ color: "var(--color-app-ink)" }}
        >
          {title}
        </span>
        <span
          className="block text-[11px]"
          style={{ color: "var(--color-app-fg-muted)" }}
        >
          {sub}
        </span>
      </span>
    </button>
  );
}
