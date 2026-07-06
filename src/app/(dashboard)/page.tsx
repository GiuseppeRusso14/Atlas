import Link from "next/link";
import {
  addDays,
  differenceInCalendarDays,
  format,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { it } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarClock,
  FileText,
  FolderKanban,
  Globe,
  Hourglass,
  Server,
  ShieldCheck,
  SquareCheckBig,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { ActivityFeed } from "@/components/activity-feed";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WeeklyBarChart, type WeeklyDatum } from "@/components/dashboard/weekly-bar-chart";
import { CompletionRadial } from "@/components/dashboard/completion-radial";
import { REPARTO_LABEL } from "@/lib/labels";
import { QUOTE_FOLLOW_UP_DAYS, quoteWaitingDays } from "@/lib/quotes";
import { ensureRenewalTasks } from "@/lib/renewal-tasks";
import { ensureSubscriptionTodos } from "@/lib/subscription-reminders";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Prisma, Reparto } from "@/generated/prisma/client";

export const metadata = { title: "Dashboard" };

const ACTIVE_STATUSES = ["DA_INIZIARE", "IN_CORSO", "IN_REVISIONE"] as const;

type Alert = {
  kind: "progetto" | "dominio" | "hosting" | "ssl";
  label: string;
  projectId: string;
  projectName: string;
  date: Date;
};

type SearchParams = Promise<{ reparto?: string; utente?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { reparto, utente } = await searchParams;

  // "Lazy cron": task di rinnovo (domini/SSL) + to-do promemoria servizi.
  await Promise.all([ensureRenewalTasks(), ensureSubscriptionTodos()]);

  const now = new Date();
  const in7Days = addDays(now, 7);
  const in45Days = addDays(now, 45);

  // Filtri per reparto/utente: applicati a progetti (membri), task (assegnatario)
  // e attività (autore).
  const repartoFilter =
    reparto && reparto in REPARTO_LABEL ? (reparto as Reparto) : undefined;

  const projectWhere: Prisma.ProjectWhereInput = {};
  if (utente) projectWhere.members = { some: { id: utente } };
  else if (repartoFilter) projectWhere.members = { some: { reparto: repartoFilter } };

  const taskWhere: Prisma.TaskWhereInput = {};
  if (utente) taskWhere.assigneeId = utente;
  else if (repartoFilter) taskWhere.assignee = { reparto: repartoFilter };

  const activityWhere: Prisma.ActivityLogWhereInput = {};
  if (utente) activityWhere.userId = utente;
  else if (repartoFilter) activityWhere.user = { reparto: repartoFilter };

  const eightWeeksAgo = startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 });

  const [
    activeProjects,
    openTasks,
    pendingQuotes,
    users,
    deadlineProjects,
    expiringWebDetails,
    completedTasks,
    completedProjects,
    activeWithTasks,
    activities,
    sentQuotes,
  ] = await Promise.all([
    prisma.project.count({
      where: { ...projectWhere, status: { in: [...ACTIVE_STATUSES] } },
    }),
    prisma.task.count({ where: { ...taskWhere, status: { not: "FATTO" } } }),
    prisma.quote.count({ where: { status: "INVIATO" } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({
      where: {
        ...projectWhere,
        status: { in: [...ACTIVE_STATUSES] },
        deadline: { not: null, lte: addDays(now, 14) },
      },
      orderBy: { deadline: "asc" },
      select: { id: true, name: true, deadline: true },
    }),
    prisma.webDetail.findMany({
      where: {
        project: { ...projectWhere, status: { not: "ARCHIVIATO" } },
        OR: [
          { domainExpiry: { not: null, lte: in45Days } },
          { hostingExpiry: { not: null, lte: in45Days } },
          { sslExpiry: { not: null, lte: in45Days } },
        ],
      },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.task.findMany({
      where: { ...taskWhere, status: "FATTO", updatedAt: { gte: eightWeeksAgo } },
      select: { updatedAt: true },
    }),
    prisma.project.findMany({
      where: {
        ...projectWhere,
        status: "COMPLETATO",
        updatedAt: { gte: eightWeeksAgo },
      },
      select: { updatedAt: true },
    }),
    prisma.project.findMany({
      where: { ...projectWhere, status: { in: [...ACTIVE_STATUSES] } },
      select: { tasks: { select: { status: true } } },
    }),
    prisma.activityLog.findMany({
      where: activityWhere,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.quote.findMany({
      where: { status: "INVIATO" },
      include: { client: { select: { name: true } } },
      orderBy: { issuedDate: "asc" },
    }),
  ]);

  // Preventivi inviati in attesa di risposta, i più "freddi" per primi.
  const waitingQuotes = sentQuotes
    .map((q) => ({ ...q, waitingDays: quoteWaitingDays(q) }))
    .sort((a, b) => b.waitingDays - a.waitingDays);

  // ---- Grafico settimanale (ultime 8 settimane) ----
  const weeks: WeeklyDatum[] = Array.from({ length: 8 }, (_, i) => {
    const start = startOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 });
    return {
      week: format(start, "d MMM", { locale: it }),
      start,
      taskCompletati: 0,
      progettiCompletati: 0,
    };
  }).map((w, i, arr) => {
    const end = i < arr.length - 1 ? arr[i + 1].start : addDays(now, 1);
    return {
      week: w.week,
      taskCompletati: completedTasks.filter(
        (t) => t.updatedAt >= w.start && t.updatedAt < end
      ).length,
      progettiCompletati: completedProjects.filter(
        (p) => p.updatedAt >= w.start && p.updatedAt < end
      ).length,
    };
  });

  // ---- Radiale: completamento medio dei progetti attivi (da task fatti) ----
  const completions = activeWithTasks
    .filter((p) => p.tasks.length > 0)
    .map((p) => p.tasks.filter((t) => t.status === "FATTO").length / p.tasks.length);
  const avgCompletion =
    completions.length > 0
      ? (completions.reduce((s, c) => s + c, 0) / completions.length) * 100
      : 0;

  // ---- Alert scadenze (progetti + dominio/hosting/SSL) ----
  const alerts: Alert[] = [
    ...deadlineProjects.map((p) => ({
      kind: "progetto" as const,
      label: "Deadline progetto",
      projectId: p.id,
      projectName: p.name,
      date: p.deadline!,
    })),
    ...expiringWebDetails.flatMap((detail) => {
      const list: Alert[] = [];
      if (detail.domainExpiry && detail.domainExpiry <= in45Days) {
        list.push({
          kind: "dominio",
          label: `Dominio ${detail.domainName ?? ""}`.trim(),
          projectId: detail.project.id,
          projectName: detail.project.name,
          date: detail.domainExpiry,
        });
      }
      if (detail.hostingExpiry && detail.hostingExpiry <= in45Days) {
        list.push({
          kind: "hosting",
          label: `Hosting ${detail.hostingProvider ?? ""}`.trim(),
          projectId: detail.project.id,
          projectName: detail.project.name,
          date: detail.hostingExpiry,
        });
      }
      if (detail.sslExpiry && detail.sslExpiry <= in45Days) {
        list.push({
          kind: "ssl",
          label: "Certificato SSL",
          projectId: detail.project.id,
          projectName: detail.project.name,
          date: detail.sslExpiry,
        });
      }
      return list;
    }),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const deadlinesNext7 = alerts.filter((a) => a.date <= in7Days).length;

  const alertIcon = {
    progetto: CalendarClock,
    dominio: Globe,
    hosting: Server,
    ssl: ShieldCheck,
  } as const;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Panoramica dell'agenzia">
        <FilterBar
          filters={[
            {
              param: "reparto",
              label: "Reparto",
              options: Object.entries(REPARTO_LABEL).map(([value, label]) => ({
                value,
                label,
              })),
            },
            {
              param: "utente",
              label: "Utente",
              options: users.map((u) => ({ value: u.id, label: u.name })),
            },
          ]}
        />
      </PageHeader>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Progetti attivi" value={activeProjects} icon={FolderKanban} highlight />
        <KpiCard label="Task aperti" value={openTasks} icon={SquareCheckBig} />
        <KpiCard label="Preventivi in attesa" value={pendingQuotes} icon={FileText} />
        <KpiCard label="Scadenze entro 7 giorni" value={deadlinesNext7} icon={AlertTriangle} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Grafico andamento */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Completati per settimana</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyBarChart data={weeks} />
          </CardContent>
        </Card>

        {/* Radiale */}
        <Card>
          <CardHeader>
            <CardTitle>Avanzamento progetti attivi</CardTitle>
          </CardHeader>
          <CardContent>
            <CompletionRadial percent={avgCompletion} />
            <p className="text-center text-xs text-muted-foreground">
              Calcolato sui task completati dei {activeProjects} progetti attivi.
            </p>
          </CardContent>
        </Card>

        {/* Feed attività */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Attività recenti</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={activities} />
          </CardContent>
        </Card>

        {/* Colonna alert: scadenze + preventivi da sollecitare */}
        <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Alert scadenze</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna scadenza imminente. 🎉
              </p>
            ) : (
              <ul className="space-y-3">
                {alerts.slice(0, 8).map((alert, i) => {
                  const days = differenceInCalendarDays(alert.date, now);
                  const Icon = alertIcon[alert.kind];
                  const urgent = days <= 7;
                  return (
                    <li key={i} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          urgent ? "bg-destructive/10 text-destructive" : "bg-accent text-primary"
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{alert.label}</p>
                        <Link
                          href={`/progetti/${alert.projectId}`}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {alert.projectName}
                        </Link>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 border-transparent",
                          urgent
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {days < 0
                          ? "Scaduto"
                          : days === 0
                            ? "Oggi"
                            : `${days} gg`}
                      </Badge>
                      <span className="sr-only">{formatDate(alert.date)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Follow-up preventivi: inviati e in attesa di risposta */}
        <Card>
          <CardHeader>
            <CardTitle>Preventivi da sollecitare</CardTitle>
          </CardHeader>
          <CardContent>
            {waitingQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessun preventivo in attesa di risposta.
              </p>
            ) : (
              <ul className="space-y-3">
                {waitingQuotes.slice(0, 6).map((quote) => {
                  const cold = quote.waitingDays >= QUOTE_FOLLOW_UP_DAYS;
                  return (
                    <li key={quote.id} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          cold
                            ? "bg-destructive/10 text-destructive"
                            : "bg-accent text-primary"
                        )}
                      >
                        <Hourglass className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/preventivi/${quote.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {quote.number}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {quote.client.name}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 border-transparent",
                          cold
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {quote.waitingDays === 0
                          ? "oggi"
                          : `${quote.waitingDays} gg`}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}
