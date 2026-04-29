"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UpdateHearingForm({
  caseId,
  initialNextDate,
  initialStatus,
  statusOptions,
}: {
  caseId: string;
  initialNextDate: string;
  initialStatus: string;
  statusOptions: string[];
}) {
  const router = useRouter();
  const [nextDate, setNextDate] = useState(initialNextDate);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    nextDate !== initialNextDate || status !== initialStatus;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/app/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextHearingDate: nextDate || null,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't update");
        setSaving(false);
        return;
      }
      setSaved(true);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error.");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl p-6"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        borderLeft: "3px solid var(--color-app-copper)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-copper-deep)",
          }}
        >
          Update hearing
        </div>
        {saved && !dirty ? (
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-aqua)",
            }}
          >
            Saved
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        <label
          htmlFor="nextDate"
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Next hearing date
        </label>
        <input
          id="nextDate"
          type="date"
          value={nextDate}
          onChange={(e) => setNextDate(e.target.value)}
          className="mt-2 block w-full rounded-md border px-3.5 py-2.5 text-[14px] outline-none transition-colors"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            borderColor: "var(--color-app-edge)",
            backgroundColor: "var(--color-app-paper)",
            color: "var(--color-app-ink)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-app-copper)";
            e.currentTarget.style.boxShadow =
              "0 0 0 3px rgba(197,133,58,0.15)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--color-app-edge)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <p
          className="mt-1.5 text-[11px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Leave blank to mark as pending. The previous date is archived to the
          hearing history when changed.
        </p>
      </div>

      <div className="mt-5">
        <label
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Status / Stage
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {statusOptions.map((opt) => {
            const isActive = status === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setStatus(opt)}
                className="rounded-md border-2 px-3 py-1.5 text-[12px] font-medium transition-all"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  borderColor: isActive
                    ? "var(--color-app-copper)"
                    : "var(--color-app-edge)",
                  backgroundColor: isActive
                    ? "rgba(197,133,58,0.12)"
                    : "var(--color-app-paper)",
                  color: isActive
                    ? "var(--color-app-copper-deep)"
                    : "var(--color-app-fg-soft)",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          className="mt-4 rounded-md px-4 py-3 text-[13px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: "var(--color-app-danger-soft)",
            border: "1px solid var(--color-app-danger)",
            color: "var(--color-app-ink)",
          }}
        >
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-[13px] font-semibold transition-all"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: dirty
              ? "var(--color-app-copper)"
              : "var(--color-app-canvas-2)",
            color: dirty
              ? "var(--color-app-copper-text)"
              : "var(--color-app-fg-muted)",
            opacity: saving ? 0.6 : 1,
            cursor: dirty && !saving ? "pointer" : "default",
            boxShadow: dirty
              ? "0 8px 20px -10px rgba(197,133,58,0.6)"
              : "none",
          }}
        >
          {saving ? "Saving…" : "Save Update"}
        </button>
      </div>
    </form>
  );
}
