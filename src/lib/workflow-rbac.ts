import { NextResponse } from "next/server";

// Caller role lifted from the partner-auth ctx via /api/app/me-style read.
// Within an office, role drives what they can do inside Work Flow.

export type WorkflowAction =
  | "view"
  | "boardCreate"
  | "boardEdit"
  | "boardDelete"
  | "listEdit"
  | "taskEdit";

const MATRIX: Record<string, Set<WorkflowAction>> = {
  admin: new Set([
    "view",
    "boardCreate",
    "boardEdit",
    "boardDelete",
    "listEdit",
    "taskEdit",
  ]),
  advocate: new Set([
    "view",
    "boardCreate",
    "boardEdit",
    "boardDelete",
    "listEdit",
    "taskEdit",
  ]),
  junior: new Set(["view", "listEdit", "taskEdit"]),
  clerk: new Set(["view", "listEdit", "taskEdit"]),
  viewer: new Set(["view"]),
};

export function canPerform(role: string, action: WorkflowAction): boolean {
  return MATRIX[role]?.has(action) ?? false;
}

const MESSAGES: Record<WorkflowAction, string> = {
  view: "You don't have access to this board.",
  boardCreate: "Only admins and advocates can create boards.",
  boardEdit: "Only admins and advocates can rename or recolour boards.",
  boardDelete: "Only admins and advocates can delete boards.",
  listEdit: "Viewers can't change cards. Ask the office admin to lift this.",
  taskEdit: "Viewers can't change cards. Ask the office admin to lift this.",
};

export function workflowDeny(
  action: WorkflowAction,
  isMobile: boolean,
  corsHeaders?: () => Record<string, string>
): NextResponse {
  return NextResponse.json(
    { error: MESSAGES[action] },
    {
      status: 403,
      headers: isMobile && corsHeaders ? corsHeaders() : undefined,
    }
  );
}
