import { prisma } from "@/lib/prisma";

type EntityType =
  | "Client"
  | "Project"
  | "Task"
  | "Quote"
  | "TimeEntry"
  | "Resource"
  | "User";

/**
 * Registra un'azione nell'activity log. Best-effort: un errore qui non
 * deve far fallire la mutazione principale.
 */
export async function logActivity(
  userId: string,
  action: string,
  entityType: EntityType,
  entityId: string
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, action, entityType, entityId },
    });
  } catch (error) {
    console.error("logActivity fallita:", error);
  }
}
