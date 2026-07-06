"use server";

import { revalidatePath } from "next/cache";
import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/action-result";

/**
 * Pulizia dell'activity log — solo ADMIN. L'eliminazione è definitiva
 * (è storico, non dati di lavoro: niente cestino).
 */

export async function deleteLogAction(logId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return actionError("Operazione riservata all'amministratore.");
  }
  await prisma.activityLog.deleteMany({ where: { id: logId } });
  revalidatePath("/log");
  return { ok: true };
}

export async function deleteLogsAction(logIds: string[]): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return actionError("Operazione riservata all'amministratore.");
  }
  const ids = logIds.filter((id) => typeof id === "string").slice(0, 500);
  if (ids.length === 0) return actionError("Nessuna voce selezionata.");
  await prisma.activityLog.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/log");
  return { ok: true };
}

/** Pulizia in blocco: voci più vecchie di N giorni (0 = svuota tutto). */
export async function deleteLogsOlderThanAction(
  days: number
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return actionError("Operazione riservata all'amministratore.");
  }
  if (!Number.isInteger(days) || days < 0) {
    return actionError("Parametro non valido.");
  }
  await prisma.activityLog.deleteMany({
    where: days === 0 ? {} : { createdAt: { lt: subDays(new Date(), days) } },
  });
  revalidatePath("/log");
  return { ok: true };
}
