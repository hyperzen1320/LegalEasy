"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildWhatsAppLink, parseDateInputLocal } from "@/lib/whatsapp";

type ClientContact = {
  name: string;
  phone: string;
  whatsapp: string;
};

type CaseContext = {
  caseNo: string;
  oppositeParty: string;
  courtName: string;
  courtPlace: string;
  officeName: string;
};

export default function UpdateHearingForm({
  caseId,
  initialNextDate,
  initialStatus,
  client,
  caseContext,
}: {
  caseId: string;
  initialNextDate: string;
  initialStatus: string;
  client: ClientContact;
  caseContext: CaseContext;
}) {
  const router = useRouter();
  const [nextDate, setNextDate] = useState(initialNextDate);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // The date we actually persisted — drives the notify block's WhatsApp
  // message so it always quotes what's on record, not a half-typed edit.
  const [savedDate, setSavedDate] = useState(initialNextDate);

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
      setSavedDate(nextDate);
      setSaved(true);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error.");
      setSaving(false);
    }
  }

  // Call + WhatsApp links for the notify block. Built from the SAVED
  // date (parsed as local midnight so the day doesn't drift in IST) so
  // the message names the hearing the advocate just locked in.
  const phoneDigits = (client.phone || "").replace(/\s+/g, "");
  const telLink = phoneDigits ? `tel:${phoneDigits}` : null;
  const waLink = buildWhatsAppLink({
    phone: client.whatsapp || client.phone || "",
    clientName: client.name,
    caseNo: caseContext.caseNo,
    oppositeParty: caseContext.oppositeParty,
    nextHearingDate: parseDateInputLocal(savedDate),
    courtName: caseContext.courtName,
    courtPlace: caseContext.courtPlace,
    officeName: caseContext.officeName,
  });
  // Show the notify block once a save has landed and nothing new is
  // pending — i.e. exactly "after Save Update", which is when uncle
  // wants the Call / WhatsApp to surface right here in the form.
  const showNotify = saved && !dirty;
  const hasContact = Boolean(telLink || waLink);

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
          htmlFor="caseStatus"
          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
          }}
        >
          Status / Stage
        </label>
        <input
          id="caseStatus"
          type="text"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="Filed, Evidence, Arguments, Mediation…"
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
          Type anything — your chambers&rsquo; own vocabulary. Type{" "}
          <span style={{ fontWeight: 600, color: "var(--color-app-ink)" }}>
            Disposed
          </span>{" "}
          to archive this matter to Disposed Cases.
        </p>
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

      {/* Notify-client block — appears right here after a successful save,
          so the advocate can ring or WhatsApp the client about the new
          date the instant it's locked in, without hunting for the
          contact card. The WhatsApp notice already quotes the saved
          date, venue and matter. */}
      {showNotify ? (
        <div
          className="mt-6 rounded-lg p-4"
          style={{
            backgroundColor: "var(--color-app-canvas-2)",
            border: "1px solid var(--color-app-edge)",
          }}
        >
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-copper-deep)",
            }}
          >
            Hearing saved — notify {client.name || "the client"}
          </div>
          {hasContact ? (
            <div className="mt-3 flex flex-wrap gap-3">
              {telLink ? (
                <a
                  href={telLink}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                  style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    backgroundColor: "var(--color-app-ink)",
                    color: "var(--color-app-ivory)",
                    boxShadow: "0 8px 20px -10px rgba(10,17,36,0.4)",
                    minWidth: 130,
                  }}
                >
                  <PhoneIcon />
                  Call
                </a>
              ) : null}
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                  style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    backgroundColor: "#25d366",
                    color: "#0b3d22",
                    boxShadow: "0 8px 20px -10px rgba(37,211,102,0.5)",
                    minWidth: 130,
                  }}
                >
                  <WhatsAppIcon />
                  WhatsApp
                </a>
              ) : null}
            </div>
          ) : (
            <p
              className="mt-2 text-[12px]"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-fg-muted)",
              }}
            >
              No phone or WhatsApp on file for this client. Add a number from
              Edit case to message them the new date here.
            </p>
          )}
        </div>
      ) : null}
    </form>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.5 3.5A11 11 0 0 0 3 16.7L1.5 22l5.4-1.4A11 11 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4-1.1l-.3-.2-3.2.8.9-3.1-.2-.3A8 8 0 1 1 12 20zm4.5-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.1-.5 0a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.6-1.2 0-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3a2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5s1.7 2.6 4.1 3.6a14 14 0 0 0 1.4.5 3.4 3.4 0 0 0 1.5.1c.5-.1 1.4-.6 1.6-1.1s.2-1 .1-1.1z" />
    </svg>
  );
}
