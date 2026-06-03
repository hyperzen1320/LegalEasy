// eCourts CNR deep-link helper.
//
// The public eCourts portal (services.ecourts.gov.in) gates its
// "search by CNR" lookup behind a captcha, so no URL can fully
// auto-submit the search. What we CAN do, and what the chambers asked
// for, is two-fold:
//   1. Best-effort prefill — append the CNR as a query param on the
//      search page so it lands pre-typed where the portal supports it.
//   2. Always copy the CNR to the clipboard (done in <CnrLink/>) so the
//      advocate can paste it in one stroke and only has to solve the
//      captcha.

export const ECOURTS_CNR_SEARCH =
  "https://services.ecourts.gov.in/ecourtindia_v6/?p=cnr_status/searchByCNR";

// CNRs are conventionally upper-case alphanumeric; normalise so the
// prefill and the clipboard copy are both clean.
export function ecourtsCnrUrl(cnr: string): string {
  const clean = (cnr || "").trim().toUpperCase();
  if (!clean) return ECOURTS_CNR_SEARCH;
  return `${ECOURTS_CNR_SEARCH}&cnr_no=${encodeURIComponent(clean)}`;
}
