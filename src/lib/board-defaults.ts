import type { BoardColor } from "@/models/Board";

// Default boards seeded for every advocate's office the first time it
// opens Work Flow. These are the boards a working chambers actually keeps
// — the set Nambiraj built by hand and asked us to ship for everyone —
// not a generic Trello starter pack.
//
// `seedKey` marks a board the app has behaviour for. Only Works by Person
// carries one today: its columns are the office's own staff, kept in step
// by lib/works-by-person.ts. A board is found by its key rather than its
// title so renaming it doesn't break the link, and so a board that merely
// happens to be called the same thing isn't hijacked.

export type BoardSeedKey = "works-by-person";

export type BoardDefault = {
  title: string;
  description: string;
  color: BoardColor;
  seedKey?: BoardSeedKey;
};

export const BOARD_DEFAULTS: BoardDefault[] = [
  {
    title: "Legal Opinions",
    description: "Opinions drafted for clients and counsel.",
    color: "ochre",
  },
  {
    title: "Works by Person",
    description: "Works List of Individuals",
    color: "terracotta",
    seedKey: "works-by-person",
  },
  {
    title: "Evidence",
    description: "The Details of PWs and DWs",
    color: "forest",
  },
  {
    title: "Paper Publication",
    description: "Substitute Service",
    color: "ink",
  },
  {
    title: "I.A.s",
    description: "Both Side Interlocutory Applications",
    color: "sea",
  },
  {
    title: "For Preparation (Office)",
    description: "The Cases Newly Prepare in Office",
    color: "plum",
  },
  {
    title: "BATTAs",
    description: "Payment for Serve the Summons",
    color: "copper",
  },
  {
    title: "C. A.s",
    description: "Disposed Cases Order Copies and Certified Copies",
    color: "terracotta",
  },
];

/**
 * Every colour a board may carry, in swatch order. This is the single
 * source: the mongoose enum reads it, both API routes validate against it,
 * and the pickers render it. Adding a colour is a one-line change here plus
 * a style entry below.
 */
export const BOARD_COLORS: BoardColor[] = [
  "forest",
  "copper",
  "sea",
  "terracotta",
  "ochre",
  "plum",
  "ink",
  "slate",
  "olive",
  "indigo",
];

// Gradient + accent colour pairs used by the UI. Stays in one place so the
// model and the renderer agree on what each colour means.
export const BOARD_COLOR_STYLES: Record<
  BoardColor,
  {
    gradient: [string, string];
    accent: string;
    text: string;
  }
> = {
  forest: {
    gradient: ["#3a5a40", "#588157"],
    accent: "#a3b18a",
    text: "#f4ede0",
  },
  copper: {
    gradient: ["#c5853a", "#8a5821"],
    accent: "#f5ebd6",
    text: "#2a1c08",
  },
  sea: {
    gradient: ["#56a0a8", "#1f4e54"],
    accent: "#d2e6e7",
    text: "#f4ede0",
  },
  terracotta: {
    gradient: ["#c14a37", "#8b3324"],
    accent: "#f6dccd",
    text: "#fff7ed",
  },
  ochre: {
    gradient: ["#d4a373", "#a0744a"],
    accent: "#fdf6e3",
    text: "#2a1c08",
  },
  plum: {
    gradient: ["#6b2737", "#3d1a25"],
    accent: "#e9d6dd",
    text: "#fff7ed",
  },
  ink: {
    gradient: ["#1a2444", "#0a1124"],
    accent: "#c5853a",
    text: "#f5ebd6",
  },
  slate: {
    gradient: ["#5a6b7a", "#2c3947"],
    accent: "#d8e2ea",
    text: "#f4ede0",
  },
  olive: {
    gradient: ["#7d8347", "#4a4f25"],
    accent: "#e8eac6",
    text: "#f4ede0",
  },
  indigo: {
    gradient: ["#544f92", "#2c2a55"],
    accent: "#dcd9f2",
    text: "#f4ede0",
  },
};
