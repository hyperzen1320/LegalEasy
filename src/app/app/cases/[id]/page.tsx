import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Case } from "@/models/Case";
import { Partner } from "@/models/Partner";
import UpdateHearingForm from "./UpdateHearingForm";
import DeleteCaseButton from "./DeleteCaseButton";
import ReopenCaseButton from "./ReopenCaseButton";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtIso(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function buildWhatsAppLink(args: {
  phone: string;
  clientName: string;
  caseNo: string;
  oppositeParty: string;
  nextHearingDate: Date | null;
  courtName: string;
  courtPlace: string;
  officeName: string;
}): string | null {
  const phone = args.phone.replace(/\D/g, "");
  if (!phone) return null;

  // assume Indian numbers if no country code (10 digits)
  const wa = phone.length === 10 ? `91${phone}` : phone;

  const dateStr = args.nextHearingDate
    ? args.nextHearingDate.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "the date communicated separately";

  const matter = args.oppositeParty
    ? `${args.clientName || "you"} vs ${args.oppositeParty}`
    : args.caseNo;

  const venue =
    [args.courtName, args.courtPlace].filter(Boolean).join(", ") ||
    "the Hon'ble Court";

  const office = args.officeName || "this office";

  const lines = [
    `Dear Mr./Ms. ${args.clientName || "Client"},`,
    ``,
    `Warm greetings from ${office}.`,
    ``,
    `This is to formally apprise you that the next hearing in your matter ${args.caseNo}` +
      (args.oppositeParty ? ` (${matter})` : ``) +
      ` has been scheduled on ${dateStr} before the ${venue}.`,
    ``,
    `You are kindly requested to ensure your presence on the said date and time, accompanied by all relevant documents previously discussed, so as to enable us to proceed with your matter without procedural complication. Non-attendance may give rise to adverse consequences, including the issuance of warrants or ex-parte orders, which we wish to avoid in your interest.`,
    ``,
    `For any clarification or to revisit the brief prior to the hearing, please feel free to contact our office at your convenience.`,
    ``,
    `Thank you for your continued cooperation and trust.`,
    ``,
    `Regards,`,
    office,
  ];

  return `https://wa.me/${wa}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();

  const session = await auth();
  if (!session?.user?.partnerId) notFound();

  const partnerId = new mongoose.Types.ObjectId(session.user.partnerId);

  await connectDB();
  const [c, partner] = await Promise.all([
    Case.findOne({
      _id: new mongoose.Types.ObjectId(id),
      partnerId,
      isDeleted: false,
    }).lean(),
    Partner.findById(partnerId).lean(),
  ]);

  if (!c) notFound();

  const officeName = partner?.branding?.officeName || partner?.name || "";

  const telLink = c.clientPhone
    ? `tel:${c.clientPhone.replace(/\s+/g, "")}`
    : null;

  const waLink = buildWhatsAppLink({
    phone: c.clientWhatsapp || c.clientPhone || "",
    clientName: c.clientName || "",
    caseNo: c.caseNo || "",
    oppositeParty: c.oppositeParty || "",
    nextHearingDate: c.nextHearingDate || null,
    courtName: c.courtName || "",
    courtPlace: c.courtPlace || "",
    officeName,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue =
    c.nextHearingDate && new Date(c.nextHearingDate) < today;
  const isToday =
    c.nextHearingDate &&
    new Date(c.nextHearingDate).toDateString() === new Date().toDateString();

  // Disposed matters belong to /app/disposed-cases — when the user lands
  // here through that archive, the breadcrumb should send them back
  // there. Same for the disposal banner + Reopen action below.
  const isDisposed = Boolean(c.disposedAt);
  const role = session.user.userType === "partner_admin" ? "admin" : "junior";
  const breadcrumbHref = isDisposed ? "/app/disposed-cases" : "/app/cases";
  const breadcrumbLabel = isDisposed ? "Disposed Cases" : "Case Vault";
  const disposedDateLabel = c.disposedAt ? fmtDate(c.disposedAt) : "";

  return (
    <div className="px-10 py-8">
      <div className="mx-auto max-w-[1100px]">
        {/* Breadcrumb + Edit shortcut */}
        <div className="fade-up-sm flex items-center justify-between gap-3">
          <Link
            href={breadcrumbHref}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors hover:opacity-70"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-fg-muted)",
            }}
          >
            <span aria-hidden>&larr;</span> {breadcrumbLabel}
          </Link>
          <Link
            href={`/app/cases/${String(c._id)}/edit`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              borderColor: "var(--color-app-edge)",
              backgroundColor: "var(--color-app-paper)",
              color: "var(--color-app-fg-soft)",
              letterSpacing: 0.4,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 20h4l10-10-4-4L4 16v4z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M14 6l4 4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            Edit case
          </Link>
        </div>

        {/* Disposed banner — only when archived. Above the hero so the
            "this is closed" signal hits before the case-no shouts. */}
        {isDisposed ? (
          <section
            className="fade-up-sm mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl px-5 py-4"
            style={{
              backgroundColor: "var(--color-app-ink)",
              color: "var(--color-app-ivory)",
              animationDelay: "30ms",
            }}
          >
            <div className="min-w-0">
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: "var(--color-app-copper)",
                }}
              >
                Disposed · archived
              </div>
              <div
                className="mt-1 text-[14px]"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  color: "rgba(245,235,214,0.92)",
                }}
              >
                Closed on{" "}
                <span style={{ fontWeight: 600 }}>{disposedDateLabel}</span>
                {c.disposalRemarks ? (
                  <>
                    {" "}
                    ·{" "}
                    <span
                      style={{
                        fontFamily:
                          "var(--font-crimson), Georgia, serif",
                        fontStyle: "italic",
                        color: "rgba(245,235,214,0.78)",
                      }}
                    >
                      "{c.disposalRemarks}"
                    </span>
                  </>
                ) : null}
              </div>
              <div
                className="mt-1.5 text-[11px]"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  color: "rgba(245,235,214,0.55)",
                }}
              >
                Hidden from Case Vault, Hearing Track and the dashboard.
              </div>
            </div>
            {role === "admin" ? (
              <ReopenCaseButton
                caseId={String(c._id)}
                caseNo={c.caseNo}
              />
            ) : null}
          </section>
        ) : null}

        {/* Hero card */}
        <section
          className="fade-up-sm relative mt-5 overflow-hidden rounded-2xl px-9 py-9"
          style={{
            backgroundColor: "var(--color-app-ink)",
            color: "var(--color-app-ivory)",
            backgroundImage:
              "radial-gradient(circle at 100% 0%, rgba(197,133,58,0.18), transparent 50%), radial-gradient(circle at 0% 100%, rgba(86,160,168,0.10), transparent 60%)",
            animationDelay: "60ms",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              {c.fileNo ? (
                <div
                  className="text-[11px] uppercase tracking-[0.22em]"
                  style={{
                    fontFamily: "var(--font-dm-mono), monospace",
                    color: "var(--color-app-copper)",
                  }}
                >
                  File &middot; {c.fileNo}
                </div>
              ) : null}
              <h1
                className="mt-2 text-[44px] font-semibold leading-[1.05] tracking-tight"
                style={{
                  fontFamily: "var(--font-crimson), Georgia, serif",
                }}
              >
                {c.caseNo}
              </h1>
              {c.cnr ? (
                <div
                  className="mt-1.5 text-[12px]"
                  style={{
                    fontFamily: "var(--font-dm-mono), monospace",
                    color: "rgba(245,235,214,0.55)",
                  }}
                >
                  CNR {c.cnr}
                </div>
              ) : null}

              {/* Parties */}
              {(c.clientName || c.oppositeParty) && (
                <div
                  className="mt-6 text-[18px] leading-[1.4]"
                  style={{
                    fontFamily: "var(--font-crimson), Georgia, serif",
                    color: "rgba(245,235,214,0.92)",
                  }}
                >
                  {c.clientName ? (
                    <span style={{ fontWeight: 600 }}>{c.clientName}</span>
                  ) : (
                    <span style={{ opacity: 0.5 }}>—</span>
                  )}
                  {c.oppositeParty ? (
                    <>
                      {" "}
                      <span
                        className="text-[12px] uppercase tracking-[0.22em]"
                        style={{
                          fontFamily: "var(--font-dm-mono), monospace",
                          color: "var(--color-app-copper)",
                          margin: "0 8px",
                        }}
                      >
                        vs
                      </span>{" "}
                      <span style={{ fontWeight: 600 }}>{c.oppositeParty}</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-3">
              {c.status ? (
                <span
                  className="rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    fontFamily: "var(--font-dm-mono), monospace",
                    backgroundColor: "var(--color-app-copper)",
                    color: "var(--color-app-copper-text)",
                  }}
                >
                  {c.status}
                </span>
              ) : null}

              {c.nextHearingDate ? (
                <div className="text-right">
                  <div
                    className="text-[10px] uppercase tracking-[0.22em]"
                    style={{
                      fontFamily: "var(--font-dm-mono), monospace",
                      color: "rgba(245,235,214,0.55)",
                    }}
                  >
                    Next hearing
                  </div>
                  <div
                    className="mt-1 text-[24px] font-semibold tabular-nums"
                    style={{
                      fontFamily: "var(--font-crimson), Georgia, serif",
                      color: isOverdue
                        ? "#ff8a8a"
                        : isToday
                          ? "var(--color-app-copper)"
                          : "var(--color-app-ivory)",
                    }}
                  >
                    {fmtDate(c.nextHearingDate)}
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    fontFamily: "var(--font-dm-mono), monospace",
                    backgroundColor: "rgba(245,235,214,0.10)",
                    color: "rgba(245,235,214,0.65)",
                    border: "1px solid rgba(245,235,214,0.2)",
                  }}
                >
                  Pending date
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2x2 info grid */}
        <section
          className="fade-up-sm mt-6 grid gap-4 md:grid-cols-2"
          style={{ animationDelay: "140ms" }}
        >
          <InfoCard
            label="Court"
            primary={c.courtName || "—"}
            secondary={
              [c.courtHall, c.courtPlace].filter(Boolean).join(" · ") ||
              undefined
            }
          />
          <InfoCard
            label="Representation"
            primary={
              c.appearingFor ? `Appearing for ${c.appearingFor}` : "—"
            }
            secondary={
              c.oppositeAdvocate
                ? `Opp. counsel: ${c.oppositeAdvocate}`
                : undefined
            }
          />
          <InfoCard
            label="Previous date"
            primary={fmtDate(c.lastHearingDate)}
            secondary={
              c.hearings && c.hearings.length > 0
                ? `${c.hearings.length} hearing${c.hearings.length === 1 ? "" : "s"} on record`
                : undefined
            }
          />
          <InfoCard
            label="I.A. Numbers"
            primary={c.iaNumbers || "—"}
            mono
          />
        </section>

        {/* Update Hearing + Client Contact */}
        <section
          className="fade-up-sm mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]"
          style={{ animationDelay: "220ms" }}
        >
          <UpdateHearingForm
            caseId={String(c._id)}
            initialNextDate={fmtIso(c.nextHearingDate)}
            initialStatus={c.status || "Filed"}
          />

          <ContactCard
            clientName={c.clientName}
            clientPhone={c.clientPhone}
            clientAddress={c.clientAddress}
            telLink={telLink}
            waLink={waLink}
          />
        </section>

        {/* Hearing history */}
        {c.hearings && c.hearings.length > 0 ? (
          <section
            className="fade-up-sm mt-6 rounded-xl p-6"
            style={{
              backgroundColor: "var(--color-app-paper)",
              boxShadow: "0 1px 0 var(--color-app-edge)",
              animationDelay: "300ms",
            }}
          >
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                color: "var(--color-app-copper-deep)",
              }}
            >
              Hearing history
            </div>
            <div className="mt-4 space-y-3">
              {c.hearings
                .slice()
                .reverse()
                .map((h, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[140px_1fr] gap-4 border-b pb-3 last:border-0 last:pb-0"
                    style={{ borderColor: "var(--color-app-edge-soft)" }}
                  >
                    <div
                      className="text-[14px] font-semibold tabular-nums"
                      style={{
                        fontFamily: "var(--font-crimson), Georgia, serif",
                        color: "var(--color-app-ink)",
                      }}
                    >
                      {fmtDate(h.date)}
                    </div>
                    <div className="text-[13px]">
                      {h.status ? (
                        <span
                          className="rounded px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
                          style={{
                            fontFamily: "var(--font-dm-mono), monospace",
                            backgroundColor: "var(--color-app-aqua-soft)",
                            color: "var(--color-app-aqua)",
                          }}
                        >
                          {h.status}
                        </span>
                      ) : null}
                      {h.outcome ? (
                        <p
                          className="mt-2"
                          style={{
                            fontFamily: "var(--font-manrope), sans-serif",
                            color: "var(--color-app-fg-soft)",
                          }}
                        >
                          {h.outcome}
                        </p>
                      ) : null}
                      {h.nextDate ? (
                        <p
                          className="mt-1 text-[11px]"
                          style={{
                            fontFamily: "var(--font-dm-mono), monospace",
                            color: "var(--color-app-fg-muted)",
                          }}
                        >
                          Adjourned to {fmtDate(h.nextDate)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ) : null}

        {/* Delete */}
        <section
          className="fade-up-sm mt-10 flex justify-center"
          style={{ animationDelay: "380ms" }}
        >
          <DeleteCaseButton caseId={String(c._id)} caseNo={c.caseNo} />
        </section>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  primary,
  secondary,
  mono,
}: {
  label: string;
  primary: string;
  secondary?: string;
  mono?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
      }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-fg-muted)",
        }}
      >
        {label}
      </div>
      <div
        className="mt-2 text-[18px] font-semibold leading-[1.3]"
        style={{
          fontFamily: mono
            ? "var(--font-dm-mono), monospace"
            : "var(--font-crimson), Georgia, serif",
          color: "var(--color-app-ink)",
        }}
      >
        {primary}
      </div>
      {secondary ? (
        <div
          className="mt-1 text-[12px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-fg-muted)",
          }}
        >
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

function ContactCard({
  clientName,
  clientPhone,
  clientAddress,
  telLink,
  waLink,
}: {
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  telLink: string | null;
  waLink: string | null;
}) {
  const hasContact = clientName || clientPhone || clientAddress;

  return (
    <div
      className="flex flex-col rounded-xl p-6"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: "0 1px 0 var(--color-app-edge)",
        borderLeft: "3px solid var(--color-app-aqua)",
      }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{
          fontFamily: "var(--font-dm-mono), monospace",
          color: "var(--color-app-copper-deep)",
        }}
      >
        Client contact
      </div>

      {hasContact ? (
        <>
          <div className="mt-4">
            <div
              className="text-[20px] font-semibold leading-tight"
              style={{
                fontFamily: "var(--font-crimson), Georgia, serif",
                color: "var(--color-app-ink)",
              }}
            >
              {clientName || "—"}
            </div>
            {clientPhone ? (
              <div
                className="mt-1 text-[13px] tabular-nums"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: "var(--color-app-fg-soft)",
                }}
              >
                {clientPhone}
              </div>
            ) : null}
            {clientAddress ? (
              <p
                className="mt-3 text-[13px] leading-[1.55]"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  color: "var(--color-app-fg-soft)",
                }}
              >
                {clientAddress}
              </p>
            ) : null}
          </div>

          <div className="mt-auto flex gap-3 pt-5">
            {telLink ? (
              <a
                href={telLink}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  backgroundColor: "var(--color-app-ink)",
                  color: "var(--color-app-ivory)",
                  boxShadow: "0 8px 20px -10px rgba(10,17,36,0.4)",
                }}
              >
                <PhoneIcon />
                Call
              </a>
            ) : (
              <button
                disabled
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold opacity-50"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  backgroundColor: "var(--color-app-canvas-2)",
                  color: "var(--color-app-fg-muted)",
                }}
              >
                <PhoneIcon />
                No phone
              </button>
            )}
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
                }}
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            ) : null}
          </div>
        </>
      ) : (
        <p
          className="mt-4 text-[13px]"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            color: "var(--color-app-fg-muted)",
          }}
        >
          No client contact saved. Edit the matter to add a phone number and
          address — that will activate the Call and WhatsApp buttons.
        </p>
      )}
    </div>
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
