import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

/** Dopo quanti giorni nel cestino un task viene eliminato definitivamente. */
export const TRASH_RETENTION_DAYS = 30;

/**
 * Svuotamento automatico del cestino ("lazy cron", all'apertura della
 * dashboard): i task cestinati da più di 30 giorni vengono eliminati
 * definitivamente. Finché sono nel cestino restano ripristinabili.
 */
export async function purgeOldTrashedTasks(): Promise<number> {
  const result = await prisma.task.deleteMany({
    where: { deletedAt: { lt: subDays(new Date(), TRASH_RETENTION_DAYS) } },
  });
  return result.count;
}
