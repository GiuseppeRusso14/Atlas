import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

/** Finestra di preavviso per rinnovi/disdette dei servizi aziendali. */
export const SUBSCRIPTION_REMINDER_DAYS = 14;

/**
 * Promemoria servizi ("lazy cron", come i task di rinnovo): quando il
 * rinnovo o la data "valutare disdetta" di un servizio entra nella
 * finestra dei 14 giorni, nasce una to-do personale per il primo ADMIN.
 *
 * Idempotenza per titolo (contiene la data). Il promemoria di pagamento
 * NON nasce se la spesa del servizio risulta già registrata nel mese del
 * rinnovo. Nessun addebito automatico: la to-do ricorda, l'umano registra.
 */
export async function ensureSubscriptionTodos(): Promise<number> {
  const now = new Date();
  const range = { gte: now, lte: addDays(now, SUBSCRIPTION_REMINDER_DAYS) };

  const [subscriptions, admin] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        active: true,
        OR: [{ renewalDate: range }, { reviewDate: range }],
      },
    }),
    prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!admin || subscriptions.length === 0) return 0;

  const inWindow = (d: Date | null): d is Date =>
    !!d && d >= range.gte && d <= range.lte;

  let created = 0;
  for (const s of subscriptions) {
    // Promemoria pagamento al rinnovo
    if (inWindow(s.renewalDate)) {
      const alreadyPaid = await prisma.profitEntry.findFirst({
        where: {
          subscriptionId: s.id,
          type: "SPESA",
          date: { gte: startOfMonth(s.renewalDate), lte: endOfMonth(s.renewalDate) },
        },
        select: { id: true },
      });
      if (!alreadyPaid) {
        const title = `Pagare ${s.name} (rinnovo ${formatDate(s.renewalDate)})`;
        const exists = await prisma.personalTodo.findFirst({
          where: { userId: admin.id, title },
          select: { id: true },
        });
        if (!exists) {
          await prisma.personalTodo.create({
            data: { userId: admin.id, title, dueDate: s.renewalDate },
          });
          created++;
        }
      }
    }

    // Promemoria "valutare disdetta"
    if (inWindow(s.reviewDate)) {
      const title = `Valutare disdetta di ${s.name} (entro ${formatDate(s.reviewDate)})`;
      const exists = await prisma.personalTodo.findFirst({
        where: { userId: admin.id, title },
        select: { id: true },
      });
      if (!exists) {
        await prisma.personalTodo.create({
          data: { userId: admin.id, title, dueDate: s.reviewDate },
        });
        created++;
      }
    }
  }
  return created;
}
