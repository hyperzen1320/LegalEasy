"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteCaseButton({
  caseId,
  caseNo,
}: {
  caseId: string;
  caseNo: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/app/cases/${caseId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't delete");
        setDeleting(false);
        return;
      }
      router.push("/app/cases");
      router.refresh();
    } catch {
      setError("Network error.");
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 rounded-md border px-5 py-2.5 text-[13px] font-medium transition-colors"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          borderColor: "var(--color-app-danger)",
          backgroundColor: "transparent",
          color: "var(--color-app-danger)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--color-app-danger-soft)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <TrashIcon /> Delete this matter
      </button>
    );
  }

  return (
    <div
      className="w-full max-w-md rounded-xl p-5"
      style={{
        backgroundColor: "var(--color-app-paper)",
        border: "1px solid var(--color-app-danger)",
      }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-danger)",
        }}
      >
        Delete {caseNo}?
      </div>
      <p
        className="mt-2 text-[13px] leading-[1.55]"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-fg-soft)",
        }}
      >
        The matter will be removed from the Case Vault, dashboard, and hearing
        track. You can recover it from records on request — but it will not
        appear in any list.
      </p>

      {error ? (
        <p
          className="mt-3 text-[12px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-danger)",
          }}
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="rounded-md border px-4 py-2 text-[13px] font-medium"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            borderColor: "var(--color-app-edge)",
            backgroundColor: "var(--color-app-paper)",
            color: "var(--color-app-fg-soft)",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="rounded-md px-4 py-2 text-[13px] font-semibold"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: "var(--color-app-danger)",
            color: "white",
            opacity: deleting ? 0.6 : 1,
          }}
        >
          {deleting ? "Deleting…" : "Yes, delete"}
        </button>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
