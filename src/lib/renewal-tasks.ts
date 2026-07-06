import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { formatDate } from "@/lib/format";

/** Finestra di preavviso: quanti giorni prima della scadenza nasce il task. */
export const RENEWAL_WINDOW_DAYS = 30;

/**
 * Scadenze → task automatici ("lazy cron", niente infrastruttura esterna):
 * viene invocata all'apertura della dashboard e genera un task "Rinnovare…"
 * per ogni dominio/hosting/SSL che entra nella finestra dei 30 giorni,
 * assegnato al primo ADMIN.
 *
 * Idempotenza: il titolo è deterministico e contiene la data di scadenza
 * (`Rinnovare dominio x (scad. 15 ago 2026)`); se un task con lo stesso
 * titolo esiste già sul progetto non viene ricreato. Dopo un rinnovo la
 * data si sposta → il titolo cambia → l'anno prossimo nasce il task nuovo.
 */
export async function ensureRenewalTasks(): Promise<number> {
  const now = new Date();
  const range = { gte: now, lte: addDays(now, RENEWAL_WINDOW_DAYS) };

  const [details, admin] = await Promise.all([
    prisma.webDetail.findMany({
      where: {
        project: { status: { notIn: ["COMPLETATO", "ARCHIVIATO"] } },
        OR: [
          { domainExpiry: range },
          { hostingExpiry: range },
          { sslExpiry: range },
        ],
      },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!admin || details.length === 0) return 0;

  type Candidate = { projectId: string; title: string; dueDate: Date };
  const candidates: Candidate[] = [];
  const inWindow = (d: Date | null): d is Date =>
    !!d && d >= range.gte && d <= range.lte;

  for (const detail of details) {
    if (inWindow(detail.domainExpiry)) {
      candidates.push({
        projectId: detail.projectId,
        title: `Rinnovare dominio ${detail.domainName ?? detail.project.name} (scad. ${formatDate(detail.domainExpiry)})`,
        dueDate: detail.domainExpiry,
      });
    }
    if (inWindow(detail.hostingExpiry)) {
      candidates.push({
        projectId: detail.projectId,
        title: `Rinnovare hosting ${detail.hostingProvider ?? detail.project.name} (scad. ${formatDate(detail.hostingExpiry)})`,
        dueDate: detail.hostingExpiry,
      });
    }
    if (inWindow(detail.sslExpiry)) {
      candidates.push({
        projectId: detail.projectId,
        title: `Rinnovare certificato SSL — ${detail.project.name} (scad. ${formatDate(detail.sslExpiry)})`,
        dueDate: detail.sslExpiry,
      });
    }
  }

  let created = 0;
  for (const candidate of candidates) {
    // Il controllo include anche i task cestinati: se l'utente ha cestinato
    // un promemoria di rinnovo, non va rigenerato a ogni apertura.
    const exists = await prisma.task.findFirst({
      where: { projectId: candidate.projectId, title: candidate.title },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.task.create({
      data: {
        ...candidate,
        status: "TODO",
        priority: "ALTA",
        assigneeId: admin.id,
        description: `Task generato automaticamente: la scadenza è entrata nella finestra dei ${RENEWAL_WINDOW_DAYS} giorni.`,
      },
    });
    await logActivity(
      admin.id,
      `task di rinnovo creato automaticamente: "${candidate.title}"`,
      "Project",
      candidate.projectId
    );
    created++;
  }
  return created;
}
