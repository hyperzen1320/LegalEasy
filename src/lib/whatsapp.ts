// Pure WhatsApp deep-link builder for the client-notification flow.
// Lives in lib/ (not a server component) so BOTH the case detail page
// (server) and the Update Hearing form (client) can build the exact
// same professionally-worded hearing notice — the form rebuilds it
// from the freshly-saved date the moment "Save Update" succeeds, so the
// advocate can notify the client without the message going stale.

export type WhatsAppNoticeArgs = {
  phone: string;
  clientName: string;
  caseNo: string;
  oppositeParty: string;
  nextHearingDate: Date | null;
  courtName: string;
  courtPlace: string;
  officeName: string;
};

export function buildWhatsAppLink(args: WhatsAppNoticeArgs): string | null {
  const phone = args.phone.replace(/\D/g, "");
  if (!phone) return null;

  // Assume Indian numbers when no country code is present (10 digits).
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

// Parses the form's yyyy-mm-dd value into a *local* midnight Date so the
// notice reads the same calendar day the advocate picked — `new
// Date("2026-05-30")` would be parsed as UTC and could slip a day in IST
// when formatted back.
export function parseDateInputLocal(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
