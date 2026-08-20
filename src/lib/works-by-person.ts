import mongoose from "mongoose";
import { Board } from "@/models/Board";
import { BoardList } from "@/models/BoardList";
import { User } from "@/models/User";
import { logActivity } from "@/lib/activity";
import { canvasSlot } from "@/lib/board-layout";

// The Works by Person board carries one column per member of the office.
//
// Chambers asked for it in as many words: every other default board is the
// same for everyone, but this one "should have the employee of their own
// office". So the roster IS the board's structure, and this keeps the two
// in step.
//
// Three rules, and they matter more than the code:
//
//  1. ADDITIVE ONLY. This never deletes, renames or reorders a column.
//     Deactivating someone leaves their column and everything on it
//     exactly where it was — a clerk who left still has to be findable
//     next to the work they did.
//
//  2. A DELETED COLUMN STAYS DELETED. A column that stands for a person
//     carries their id in `seedUserId`, and the check for "does this
//     person already have one?" looks at soft-deleted lists too. Without
//     that, a column somebody removed on purpose would grow back on the
//     next board open, forever.
//
//  3. IT ADOPTS WHAT IS ALREADY THERE. An office that built this board by
//     hand — Nambiraj has — already has a column per advocate. The first
//     run matches those columns to people by name and claims them, rather
//     than creating a second column for everyone.
//
// Called on seeding and whenever a user is created. Never allowed to fail
// the operation that triggered it.

const SEED_KEY = "works-by-person";

/** Title fallback for an office that built the board before seedKey existed. */
const TITLE_HINT = /works?\s*by\s*person/i;

/** Names are compared as bare letters — "Manish R. V." === "manish r v". */
function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`.trim();
}

/**
 * Index users by a normalised key, dropping any key two people share.
 * An ambiguous name means nobody is matched on it: a duplicate column is
 * a nuisance, but filing one colleague's work under another's name is a
 * mistake the office would have to unpick by hand.
 */
function uniqueIndex(
  users: Array<{ _id: mongoose.Types.ObjectId; firstName: string; lastName: string }>,
  keyOf: (u: { firstName: string; lastName: string }) => string
): Map<string, string> {
  const seen = new Map<string, string | null>();
  for (const u of users) {
    const key = keyOf(u);
    if (!key) continue;
    seen.set(key, seen.has(key) ? null : String(u._id));
  }
  const out = new Map<string, string>();
  for (const [key, id] of seen) if (id) out.set(key, id);
  return out;
}

/**
 * Give every active member of this office a column on the Works by Person
 * board. Resolves quietly if the office has no such board (it was deleted,
 * or the chambers predates the seed).
 */
export async function syncWorksByPersonLists(
  partnerId: string | mongoose.Types.ObjectId
): Promise<void> {
  const pid =
    typeof partnerId === "string"
      ? new mongoose.Types.ObjectId(partnerId)
      : partnerId;

  // ── 1. Find the board ────────────────────────────────────────────────
  // By key first: that survives a rename. Only fall back to the title when
  // no board carries the key yet, and stamp the key on whatever it finds so
  // this is the last time the title matters.
  let found = await Board.findOne({
    partnerId: pid,
    seedKey: SEED_KEY,
    isDeleted: false,
  });

  let adopting = false;
  if (!found) {
    found = await Board.findOne({
      partnerId: pid,
      seedKey: null,
      title: TITLE_HINT,
      isDeleted: false,
    }).sort({ createdAt: 1 });
    if (!found) return;
    found.seedKey = SEED_KEY;
    await found.save();
    adopting = true;
  }
  const board = found;

  // ── 2. Who is in the office, and what is already on the board ────────
  const [users, lists] = await Promise.all([
    User.find({ partnerId: pid, active: true })
      .select("_id firstName lastName")
      .sort({ firstName: 1, lastName: 1 })
      .lean(),
    // isDeleted is NOT filtered — see rule 2 at the top of this file.
    BoardList.find({ partnerId: pid, boardId: board._id })
      .select("_id title seedUserId isDeleted sortOrder")
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean(),
  ]);
  if (users.length === 0) return;

  const claimed = new Set(
    lists.filter((l) => l.seedUserId).map((l) => String(l.seedUserId))
  );

  // ── 3. Adopt hand-made columns ───────────────────────────────────────
  // Only on the run that took the board over. Full name wins over first
  // name, so "Ravi Kumar" claims the "Ravi Kumar" column rather than a
  // bare "Ravi" one belonging to someone else.
  if (adopting) {
    const byFull = uniqueIndex(users, (u) => norm(fullName(u)));
    const byFirst = uniqueIndex(users, (u) => norm(u.firstName || ""));

    const adoptions: Array<{
      listId: mongoose.Types.ObjectId;
      userId: string;
    }> = [];
    for (const l of lists) {
      if (l.seedUserId || l.isDeleted) continue;
      const key = norm(l.title || "");
      if (!key) continue;
      const userId = byFull.get(key) ?? byFirst.get(key);
      if (!userId || claimed.has(userId)) continue;
      claimed.add(userId);
      adoptions.push({ listId: l._id, userId });
    }

    if (adoptions.length > 0) {
      await BoardList.bulkWrite(
        adoptions.map((a) => ({
          updateOne: {
            filter: { _id: a.listId },
            update: {
              $set: { seedUserId: new mongoose.Types.ObjectId(a.userId) },
            },
          },
        }))
      );
    }
  }

  // ── 4. Create a column for whoever is still without one ──────────────
  const missing = users.filter((u) => !claimed.has(String(u._id)));
  if (missing.length === 0) return;

  // Continue the canvas grid past what's on the board, so a new column
  // doesn't land on top of the first one. Soft-deleted lists don't hold a
  // slot.
  const live = lists.filter((l) => !l.isDeleted);
  let slot = live.length;
  let sortOrder =
    live.reduce((max, l) => Math.max(max, l.sortOrder ?? 0), -1) + 1;

  const created = await BoardList.insertMany(
    missing.map((u) => ({
      partnerId: pid,
      boardId: board._id,
      title: fullName(u) || "Member",
      seedUserId: u._id,
      sortOrder: sortOrder++,
      position: canvasSlot(slot++),
    }))
  );

  // A column appearing on a shared board without explanation is exactly
  // the sort of thing that makes an office ask who did it. Say so.
  await Promise.all(
    created.map((doc) =>
      logActivity({
        actor: { id: null, name: "Legalezi", email: "", type: "system" },
        action: "list.created",
        targetType: "list",
        targetId: String(doc._id),
        targetName: doc.title,
        partnerId: String(pid),
        boardId: String(board._id),
        message: `added list **${doc.title}** to **${board.title}**`,
        metadata: { boardTitle: board.title, seeded: true },
      })
    )
  );
}

/**
 * Fire-and-forget wrapper. The roster is a convenience; it must never be
 * the reason creating a colleague's login fails.
 */
export function syncWorksByPersonListsSafe(
  partnerId: string | mongoose.Types.ObjectId
): Promise<void> {
  return syncWorksByPersonLists(partnerId).catch((err) => {
    console.error("[works-by-person] sync failed:", err);
  });
}
