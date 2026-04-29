import Link from "next/link";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Case } from "@/models/Case";
import CaseListClient, { type CaseRow } from "./CaseListClient";

export default async function CaseVault() {
  const session = await auth();
  const partnerId = session?.user?.partnerId
    ? new mongoose.Types.ObjectId(session.user.partnerId)
    : null;

  let cases: CaseRow[] = [];

  if (partnerId) {
    await connectDB();
    const docs = await Case.find({ partnerId, isDeleted: false })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();
    cases = docs.map((c) => ({
      id: String(c._id),
      caseNo: c.caseNo,
      fileNo: c.fileNo,
      cnr: c.cnr,
      clientName: c.clientName,
      oppositeParty: c.oppositeParty,
      courtName: c.courtName,
      courtPlace: c.courtPlace,
      status: c.status,
      nextHearingDate: c.nextHearingDate
        ? c.nextHearingDate.toISOString()
        : null,
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  return (
    <div className="px-10 py-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2
              className="text-[40px] font-semibold tracking-tight leading-[1.1]"
              style={{
                fontFamily: "var(--font-crimson), Georgia, serif",
                color: "var(--color-app-ink)",
              }}
            >
              Case Vault
            </h2>
            <p
              className="mt-2 text-[13px]"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-fg-muted)",
              }}
            >
              {cases.length === 0 ? (
                "No matters on record yet."
              ) : (
                <>
                  <span style={{ color: "var(--color-app-ink)", fontWeight: 600 }}>
                    {cases.length}
                  </span>{" "}
                  {cases.length === 1 ? "matter" : "matters"} on record
                </>
              )}
            </p>
          </div>

          <Link
            href="/app/cases/new"
            className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              backgroundColor: "var(--color-app-copper)",
              color: "var(--color-app-copper-text)",
              boxShadow: "0 8px 20px -10px rgba(197,133,58,0.6)",
            }}
          >
            <span>+</span> New Case
          </Link>
        </div>

        {cases.length === 0 ? (
          <EmptyVault />
        ) : (
          <CaseListClient cases={cases} />
        )}
      </div>
    </div>
  );
}

function EmptyVault() {
  return (
    <div
      className="mt-10 rounded-xl p-16 text-center"
      style={{
        backgroundColor: "var(--color-app-paper)",
        border: "1px dashed var(--color-app-edge)",
      }}
    >
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--color-app-canvas-2)",
          color: "var(--color-app-copper-deep)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 12h18" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
      <h3
        className="mt-6 text-[28px] font-semibold tracking-tight"
        style={{
          fontFamily: "var(--font-crimson), Georgia, serif",
          color: "var(--color-app-ink)",
        }}
      >
        The vault is empty.
      </h3>
      <p
        className="mx-auto mt-3 max-w-md text-[14px] leading-7"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-fg-muted)",
        }}
      >
        Add your first matter — case number, court, client, status, and the
        next hearing date. The dashboard, hearing track, and pending-date list
        all read from this one place.
      </p>
      <Link
        href="/app/cases/new"
        className="mt-7 inline-flex items-center gap-2 rounded-md px-6 py-3 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          backgroundColor: "var(--color-app-ink)",
          color: "var(--color-app-ivory)",
          boxShadow: "0 8px 20px -10px rgba(10,17,36,0.4)",
        }}
      >
        <span>+</span> Add the first case
      </Link>
    </div>
  );
}
