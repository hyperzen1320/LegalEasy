"use client";

import { useEffect, useRef, useState } from "react";

// Auto-resize textarea + Send button. Enter sends, Shift+Enter inserts a
// newline. Send is disabled while empty or while a previous send is in
// flight. A character counter shows up once the user passes 3500/4000
// (warning before the hard cap so they know to wrap up).

const MAX_BODY = 4000;
const WARN_AT = 3500;

export default function Composer({
  onSend,
  disabled,
  placeholder,
  sending,
  errorMessage,
}: {
  onSend: (body: string) => Promise<boolean>;
  disabled?: boolean;
  placeholder: string;
  sending: boolean;
  errorMessage: string | null;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize: grow with content up to ~6 lines, then internal scroll.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [value]);

  async function tryToSend() {
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    if (trimmed.length > MAX_BODY) return;
    const ok = await onSend(trimmed);
    if (ok) {
      setValue("");
      // Reset the textarea's height after the value clears.
      requestAnimationFrame(() => {
        if (ref.current) ref.current.style.height = "auto";
      });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      tryToSend();
    }
  }

  const remaining = MAX_BODY - value.length;
  const showCounter = value.length >= WARN_AT;
  const overLimit = value.length > MAX_BODY;

  return (
    <div
      className="border-t px-5 py-4"
      style={{
        backgroundColor: "var(--color-app-paper)",
        borderColor: "var(--color-app-edge)",
      }}
    >
      {errorMessage ? (
        <div
          className="mb-2 rounded-md px-3 py-2 text-[12px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: "var(--color-app-danger-soft)",
            color: "var(--color-app-danger)",
          }}
        >
          {errorMessage}
        </div>
      ) : null}
      <div
        className="flex items-end gap-3 rounded-xl px-3 py-2"
        style={{
          backgroundColor: "var(--color-app-canvas-2)",
          border: `1px solid ${overLimit ? "var(--color-app-danger)" : "var(--color-app-edge)"}`,
        }}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled || sending}
          className="block flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-[13.5px] outline-none disabled:opacity-60"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-ink)",
            minHeight: 36,
            maxHeight: 144,
          }}
        />
        <button
          onClick={tryToSend}
          disabled={
            disabled || sending || !value.trim() || overLimit
          }
          aria-label="Send"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3.5 text-[12px] font-semibold transition-all"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: "var(--color-app-copper)",
            color: "var(--color-app-copper-text)",
            opacity:
              disabled || sending || !value.trim() || overLimit ? 0.45 : 1,
            cursor:
              disabled || sending || !value.trim() || overLimit
                ? "not-allowed"
                : "pointer",
            boxShadow:
              !disabled && !sending && value.trim() && !overLimit
                ? "0 6px 14px -8px rgba(197,133,58,0.6)"
                : "none",
          }}
        >
          {sending ? "Sending…" : "Send"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 12l18-9-7 18-2-7-9-2z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div
          className="text-[10px]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
            letterSpacing: 0.3,
          }}
        >
          Enter to send · Shift+Enter for a new line
        </div>
        {showCounter ? (
          <div
            className="text-[10px] tabular-nums"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: overLimit
                ? "var(--color-app-danger)"
                : remaining < 200
                  ? "var(--color-app-copper-deep)"
                  : "var(--color-app-fg-muted)",
              fontWeight: overLimit ? 700 : 500,
            }}
          >
            {remaining < 0 ? `${Math.abs(remaining)} over` : `${remaining} left`}
          </div>
        ) : null}
      </div>
    </div>
  );
}
