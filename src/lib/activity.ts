import { Activity } from "@/models/Activity";

type ActorType = "global_admin" | "partner_admin" | "user" | "system";

type LogActivityArgs = {
  actor: {
    id: string | null;
    name: string;
    email: string;
    type: ActorType;
  };
  action: string;
  targetType: "partner" | "user" | "system";
  targetId?: string | null;
  targetName?: string;
  message: string;
  metadata?: Record<string, unknown>;
  partnerId?: string | null;
};

export async function logActivity(args: LogActivityArgs): Promise<void> {
  try {
    await Activity.create({
      actorUserId: args.actor.id,
      actorName: args.actor.name,
      actorEmail: args.actor.email,
      actorType: args.actor.type,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId ?? null,
      targetName: args.targetName ?? "",
      message: args.message,
      metadata: args.metadata ?? {},
      partnerId: args.partnerId ?? null,
    });
  } catch (err) {
    // Don't crash the parent operation if activity logging fails.
    console.error("[activity] failed to log:", err);
  }
}
