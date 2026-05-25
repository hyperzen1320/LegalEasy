import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The case-export pipeline pulls in pdfkit, exceljs and docx — all of
  // which ship binary / non-JS assets (AFM font files for pdfkit, schema
  // files for the office formats). Next's serverless bundler strips
  // anything it doesn't recognise as code, which is why the PDF export
  // was returning a 500 on Vercel ("ENOENT … Helvetica.afm"). Marking
  // these as external packages tells Next to require them at runtime
  // from node_modules — the files come along intact and the generators
  // can read their data.
  serverExternalPackages: ["pdfkit", "exceljs", "docx"],
};

export default nextConfig;
