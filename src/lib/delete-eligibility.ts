// Smart delete rule:
//  - Admins can always delete directly
//  - Non-admins can direct-delete lists/cards only if they CREATED the target
//    AND the target is empty (a list with no cards, or a card with no
//    description and no checklist items).
//  - Otherwise the non-admin must raise a delete request.

import type { IBoardList } from "@/models/BoardList";
import type { ITask } from "@/models/Task";
import { Task } from "@/models/Task";

type RoleCheck = { isAdmin: boolean; userId: string };

export async function canDirectDeleteList(
  list: IBoardList,
  who: RoleCheck
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (who.isAdmin) return { ok: true };
  if (!list.createdBy || String(list.createdBy) !== who.userId) {
    return {
      ok: false,
      reason:
        "Only the office admin can delete lists they didn't create. Please raise a delete request.",
    };
  }
  // Empty if no active tasks remain
  const taskCount = await Task.countDocuments({
    partnerId: list.partnerId,
    listId: list._id,
    isDeleted: false,
  });
  if (taskCount > 0) {
    return {
      ok: false,
      reason:
        "This list still has cards. Empty it first or raise a delete request with a reason.",
    };
  }
  return { ok: true };
}

export function canDirectDeleteTask(
  task: ITask,
  who: RoleCheck
): { ok: true } | { ok: false; reason: string } {
  if (who.isAdmin) return { ok: true };
  if (!task.createdBy || String(task.createdBy) !== who.userId) {
    return {
      ok: false,
      reason:
        "Only the office admin can delete cards they didn't create. Please raise a delete request.",
    };
  }
  const desc = (task.description || "").trim();
  let hasChecklistItems = false;
  for (const c of task.checklists || []) {
    if (c.items && c.items.length > 0) {
      hasChecklistItems = true;
      break;
    }
  }
  if (desc.length > 0 || hasChecklistItems) {
    return {
      ok: false,
      reason:
        "This card has content. Clear it first or raise a delete request with a reason.",
    };
  }
  return { ok: true };
}

export function canDirectDeleteBoard(who: RoleCheck): {
  ok: true | false;
  reason?: string;
} {
  // Boards always require admin to delete (too consequential).
  if (who.isAdmin) return { ok: true };
  return {
    ok: false,
    reason:
      "Only the office admin can delete a whole board. Please raise a delete request.",
  };
}

// Generic: top-level objects (clients, courts, cases, users, prompts)
// — non-admins must always request.
export function canDirectDeleteGeneric(who: RoleCheck): {
  ok: true | false;
  reason?: string;
} {
  if (who.isAdmin) return { ok: true };
  return {
    ok: false,
    reason:
      "Only the office admin can delete this. Please raise a delete request.",
  };
}
