import PDFDocument from "pdfkit";
import {
  type CaseExportInput,
  type CaseExportColumn,
  type CaseExportRow,
  companyName,
  companyInitials,
  valueFor,
} from "./types";

// PDF export via pdfkit. We render landscape A4 with a Midnight Counsel
// styled header band on top of the table:
//
//   ┌────────────────────────────────────────────────────────────────────┐
//   │  ▢ TC   Testing Chambers                                           │  ← ink band
//   │         Tejas Gudur  ·  Krishnagiri, Tamil Nadu  ·  +91 9XXXXXXXXX │
//   ├────────────────────────────────────────────────────────────────────┤
//   │  Case Report  ·  26 May 2026                                       │  ← copper band
//   ├────────────────────────────────────────────────────────────────────┤
//   │  Filter: Court — DJK · Krishnagiri                                 │  ← muted italic
//   │  Filter: Next date 01 Apr 2026 → 30 Apr 2026                       │
//   │                                                                    │
//   │  ┌─────┬───────────┬───────────┬──────────────┬─────────────────┐  │
//   │  │S.No │ File No   │ Case No   │ Client Name  │ ... (table)     │  │
//   │  ├─────┼───────────┼───────────┼──────────────┼─────────────────┤  │
//   │  │  1  │ NLD/...   │ O.S. ...  │ Hameera      │                 │  │
//   │  └─────┴───────────┴───────────┴──────────────┴─────────────────┘  │
//   │                              Page 1 of 3                            │
//   └────────────────────────────────────────────────────────────────────┘
//
// All colours match the in-app theme as closely as the PDF spec allows.

const INK = "#0a1124";
const IVORY = "#f5ebd6";
const COPPER = "#c5853a";
const COPPER_TEXT = "#1f1308";
const CANVAS_2 = "#ebe2d0";
const EDGE = "#d9cfb8";
const MUTED = "#6b6253";

const MARGIN = 28;
const HEADER_BAND_HEIGHT = 64;
const COPPER_BAND_HEIGHT = 28;
const ROW_HEIGHT = 22;
const HEADER_ROW_HEIGHT = 26;

export async function generatePdf(input: CaseExportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: MARGIN,
      info: {
        Title: `${companyName(input.partner)} — Case Report`,
        Author: "LegalEasy",
        Creator: "LegalEasy",
        CreationDate: input.generatedAt,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - MARGIN * 2;
    const cols = computeColumnWidths(input.columns, contentWidth);

    drawHeader(doc, input, contentWidth);
    const filterSummaryHeight = drawFilterSummary(doc, input);

    let cursorY =
      MARGIN +
      HEADER_BAND_HEIGHT +
      COPPER_BAND_HEIGHT +
      filterSummaryHeight +
      8;

    cursorY = drawTableHeader(doc, cursorY, cols);

    if (input.cases.length === 0) {
      doc
        .fillColor(MUTED)
        .font("Helvetica-Oblique")
        .fontSize(10)
        .text(
          "No matters matched the current filters.",
          MARGIN,
          cursorY + 12,
          { width: contentWidth, align: "center" }
        );
    } else {
      for (let i = 0; i < input.cases.length; i++) {
        const row = input.cases[i];

        // Page-break check. ~50pt buffer so we never split a row
        // across pages.
        if (cursorY + ROW_HEIGHT > doc.page.height - MARGIN - 24) {
          drawPageFooter(doc, input);
          doc.addPage();
          drawHeader(doc, input, contentWidth);
          const fh = drawFilterSummary(doc, input);
          cursorY =
            MARGIN +
            HEADER_BAND_HEIGHT +
            COPPER_BAND_HEIGHT +
            fh +
            8;
          cursorY = drawTableHeader(doc, cursorY, cols);
        }

        cursorY = drawBodyRow(doc, cursorY, cols, input.columns, row, i);
      }
    }

    drawPageFooter(doc, input);
    doc.end();
  });
}

type ResolvedCol = {
  def: CaseExportColumn;
  x: number;
  width: number;
};

function computeColumnWidths(
  defs: CaseExportColumn[],
  contentWidth: number
): ResolvedCol[] {
  const totalWeight = defs.reduce((acc, c) => acc + c.width, 0);
  let x = MARGIN;
  const out: ResolvedCol[] = [];
  for (const def of defs) {
    const w = (def.width / totalWeight) * contentWidth;
    out.push({ def, x, width: w });
    x += w;
  }
  return out;
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  input: CaseExportInput,
  contentWidth: number
) {
  // Ink band
  doc
    .save()
    .rect(MARGIN, MARGIN, contentWidth, HEADER_BAND_HEIGHT)
    .fill(INK);

  // Monogram disc (copper circle, ink initials).
  const discRadius = 18;
  const discCx = MARGIN + 22;
  const discCy = MARGIN + HEADER_BAND_HEIGHT / 2;
  doc.circle(discCx, discCy, discRadius).fill(COPPER);
  doc
    .fillColor(INK)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(
      companyInitials(input.partner),
      discCx - 13,
      discCy - 6,
      { width: 26, align: "center" }
    );

  // Company name
  const titleX = MARGIN + 52;
  doc
    .fillColor(IVORY)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(
      companyName(input.partner),
      titleX,
      MARGIN + 12,
      { lineBreak: false }
    );

  // Sub-meta line (primary contact · city · phone)
  const metaParts: string[] = [];
  if (input.partner.primaryContactName) {
    metaParts.push(input.partner.primaryContactName);
  }
  if (input.partner.city || input.partner.state) {
    metaParts.push(
      [input.partner.city, input.partner.state].filter(Boolean).join(", ")
    );
  }
  if (input.partner.phone) {
    metaParts.push(input.partner.phone);
  }
  if (metaParts.length > 0) {
    doc
      .fillColor("#b89d6a")
      .font("Helvetica-Oblique")
      .fontSize(9.5)
      .text(metaParts.join("   ·   "), titleX, MARGIN + 36, {
        lineBreak: false,
      });
  }

  doc.restore();

  // Copper band beneath with the report title.
  doc
    .save()
    .rect(MARGIN, MARGIN + HEADER_BAND_HEIGHT, contentWidth, COPPER_BAND_HEIGHT)
    .fill(COPPER);
  doc
    .fillColor(COPPER_TEXT)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(
      `CASE REPORT   ·   ${input.generatedAt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`,
      MARGIN + 14,
      MARGIN + HEADER_BAND_HEIGHT + 8,
      { lineBreak: false }
    );
  doc.restore();
}

function drawFilterSummary(
  doc: PDFKit.PDFDocument,
  input: CaseExportInput
): number {
  if (input.filters.lines.length === 0) return 0;
  const startY = MARGIN + HEADER_BAND_HEIGHT + COPPER_BAND_HEIGHT + 6;
  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(9);
  let y = startY;
  for (const line of input.filters.lines) {
    doc.text(line, MARGIN + 4, y, { lineBreak: false });
    y += 12;
  }
  return y - startY + 4;
}

function drawTableHeader(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: ResolvedCol[]
): number {
  doc.save();
  const totalWidth = cols.reduce((acc, c) => acc + c.width, 0);
  doc.rect(MARGIN, y, totalWidth, HEADER_ROW_HEIGHT).fill(COPPER);

  doc.fillColor(COPPER_TEXT).font("Helvetica-Bold").fontSize(9);
  for (const col of cols) {
    const align =
      col.def.align === "center"
        ? "center"
        : col.def.align === "right"
          ? "right"
          : "left";
    doc.text(col.def.label.toUpperCase(), col.x + 6, y + 8, {
      width: col.width - 12,
      align,
      lineBreak: false,
    });
  }
  doc.restore();

  // Underline
  doc
    .strokeColor(EDGE)
    .lineWidth(0.5)
    .moveTo(MARGIN, y + HEADER_ROW_HEIGHT)
    .lineTo(MARGIN + totalWidth, y + HEADER_ROW_HEIGHT)
    .stroke();

  return y + HEADER_ROW_HEIGHT;
}

function drawBodyRow(
  doc: PDFKit.PDFDocument,
  y: number,
  cols: ResolvedCol[],
  defs: CaseExportColumn[],
  row: CaseExportRow,
  index: number
): number {
  const totalWidth = cols.reduce((acc, c) => acc + c.width, 0);

  // Zebra striping. Index 0 keeps the paper background (no fill);
  // index 1 gets canvas-2 to ease reading along long rows.
  if (index % 2 === 1) {
    doc
      .save()
      .rect(MARGIN, y, totalWidth, ROW_HEIGHT)
      .fill(CANVAS_2)
      .restore();
  }

  doc.fillColor(INK).font("Helvetica").fontSize(9);
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const def = defs[i];
    const value = valueFor(def, row, index);
    const align =
      def.align === "center"
        ? "center"
        : def.align === "right"
          ? "right"
          : "left";
    // Truncate long values rather than wrap — keeps the table readable.
    // The full content lives in the case detail page for anyone who
    // needs every character.
    const safe = truncate(value, Math.max(Math.floor(col.width / 4), 10));
    doc.text(safe, col.x + 6, y + 7, {
      width: col.width - 12,
      align,
      lineBreak: false,
      ellipsis: true,
    });
  }

  // Bottom border.
  doc
    .strokeColor(EDGE)
    .lineWidth(0.4)
    .moveTo(MARGIN, y + ROW_HEIGHT)
    .lineTo(MARGIN + totalWidth, y + ROW_HEIGHT)
    .stroke();

  return y + ROW_HEIGHT;
}

function drawPageFooter(
  doc: PDFKit.PDFDocument,
  input: CaseExportInput
) {
  const range = doc.bufferedPageRange();
  // Footer shows the page number on the right and the company name +
  // generated date on the left.
  const pageIndex = range.start + range.count - 1;
  const pageNum = pageIndex - range.start + 1;
  const y = doc.page.height - MARGIN - 12;

  doc.save();
  doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(8);
  doc.text(
    `${companyName(input.partner)}  ·  ${input.generatedAt.toLocaleDateString(
      "en-IN",
      { day: "2-digit", month: "short", year: "numeric" }
    )}`,
    MARGIN,
    y,
    { lineBreak: false }
  );
  doc.text(
    `Page ${pageNum}`,
    doc.page.width - MARGIN - 80,
    y,
    { width: 80, align: "right", lineBreak: false }
  );
  doc.restore();
}

function truncate(value: string, maxChars: number): string {
  if (!value) return "";
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(maxChars - 1, 1))}…`;
}
