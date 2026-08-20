import mongoose from "mongoose";
import { Board } from "@/models/Board";
import { BOARD_DEFAULTS } from "@/lib/board-defaults";
import { syncWorksByPersonListsSafe } from "@/lib/works-by-person";

// One place decides what an office starts with.
//
// This block used to be hand-copied into the boards API route and the web
// Work Flow page. They drifted the moment either changed, which meant an
// office could get one set of boards from the app and another from the
// browser depending on which it opened first. Both call this now.
//
// SERVER ONLY — it pulls mongoose in. Client components import
// lib/board-defaults, which deliberately has no runtime model import.

/**
 * Seed the default boards for an office that has none, then bring the
 * Works by Person roster up to date. Safe to call on every read: the
 * insert is skipped once a single board exists.
 */
export async function ensureBoardsSeeded(
  partnerId: string | mongoose.Types.ObjectId
): Promise<void> {
  const pid =
    typeof partnerId === "string"
      ? new mongoose.Types.ObjectId(partnerId)
      : partnerId;

  const count = await Board.countDocuments({
    partnerId: pid,
    isDeleted: false,
  });

  if (count === 0) {
    await Board.insertMany(
      BOARD_DEFAULTS.map((b, idx) => ({
        partnerId: pid,
        title: b.title,
        description: b.description,
        color: b.color,
        sortOrder: idx,
        isSeeded: true,
        seedKey: b.seedKey ?? null,
      }))
    );
  }

  // Runs on every visit, not just the first: an office that hired someone
  // yesterday should see their column today, and an office that built its
  // own Works by Person board before this existed gets it adopted on the
  // next open. Never throws — a missing column is not worth a 500.
  await syncWorksByPersonListsSafe(pid);
}
