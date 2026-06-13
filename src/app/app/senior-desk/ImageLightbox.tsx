"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

// WhatsApp-style image viewer. A full-screen dark overlay with the image
// centred — opens in-app instead of redirecting to the raw file. Close on
// Esc, click-out or ✕; download from the top bar.
export default function ImageLightbox({
  src,
  filename,
  onClose,
}: {
  src: string;
  filename: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex flex-col"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between gap-4 px-5 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="min-w-0 flex-1 truncate text-[13px]"
          style={{ fontFamily: "var(--font-manrope), sans-serif", color: "rgba(255,255,255,0.85)" }}
          title={filename}
        >
          {filename}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <a
            href={`${src}?download=1`}
            download={filename}
            aria-label="Download"
            title="Download"
            className="flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-white/10"
            style={{ color: "#ffffff" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-white/10"
            style={{ color: "#ffffff" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={filename}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="rounded-md"
          style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
        />
      </div>
    </div>,
    document.body
  );
}
