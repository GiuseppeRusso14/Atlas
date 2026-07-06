import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

export const metadata = { title: "Calendario" };

/** Tipi di evento mostrati nel calendario, con etichette e colori (token). */
const EVENT_TYPES = {
  post: { label: "Post social", chip: "bg-accent-2/10 text-accent-2" },
  task: { label: "Task", chip: "bg-primary/10 text-primary" },
  deadline: { label: "Deadline progetti", chip: "bg-destructive/10 text-destructive" },
  web: { label: "Scadenze dominio/SSL", chip: "bg-secondary text-secondary-foreground" },
  servizio: { label: "Rinnovi servizi", chip: "bg-success/10 text-success" },
} as const;

type EventType = keyof typeof EVENT_TYPES;

type CalendarEvent = {
  date: Date;
  type: EventType;
  label: string;
  sublabel?: string;
  href: string;
};

type SearchParams = Promise<{ mese?: string; tipi?: string }>;

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { mese, tipi } = await searchParams;
  const month = mese ? parse(mese, "yyyy-MM", new Date()) : startOfMonth(new Date());
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const range = { gte: gridStart, lte: gridEnd };

  // Tipi attivi (default: tutti). Param `tipi` = lista separata da virgola.
  const activeTypes = new Set<EventType>(
    tipi
      ? (tipi.split(",").filter((t) => t in EVENT_TYPES) as EventType[])
      : (Object.keys(EVENT_TYPES) as EventType[])
  );

  const [posts, tasks, deadlines, webDetails, subscriptions] = await Promise.all([
    prisma.socialPost.findMany({
      where: { scheduledDate: range },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.task.findMany({
      where: { dueDate: range, status: { not: "FATTO" } },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.project.findMany({
      where: { deadline: range, status: { notIn: ["COMPLETATO", "ARCHIVIATO"] } },
      select: { id: true, name: true, deadline: true },
    }),
    prisma.webDetail.findMany({
      where: {
        project: { status: { not: "ARCHIVIATO" } },
        OR: [
          { domainExpiry: range },
          { hostingExpiry: range },
          { sslExpiry: range },
        ],
      },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.subscription.findMany({
      where: {
        active: true,
        OR: [{ renewalDate: range }, { reviewDate: range }],
      },
    }),
  ]);

  const events: CalendarEvent[] = [
    ...posts.map((p) => ({
      date: p.scheduledDate!,
      type: "post" as const,
      label: p.caption ?? p.platform,
      sublabel: p.project.name,
      href: `/progetti/${p.project.id}`,
    })),
    ...tasks.map((t) => ({
      date: t.dueDate!,
      type: "task" as const,
      label: t.title,
      sublabel: t.project.name,
      href: `/task?progetto=${t.project.id}`,
    })),
    ...deadlines.map((p) => ({
      date: p.deadline!,
      type: "deadline" as const,
      label: `Deadline: ${p.name}`,
      href: `/progetti/${p.id}`,
    })),
    ...subscriptions.flatMap((s) => {
      const list: CalendarEvent[] = [];
      const inRange = (x: Date | null): x is Date =>
        !!x && x >= gridStart && x <= gridEnd;
      if (inRange(s.renewalDate))
        list.push({ date: s.renewalDate, type: "servizio", label: `Rinnovo ${s.name}`, href: "/utile" });
      if (inRange(s.reviewDate))
        list.push({ date: s.reviewDate, type: "servizio", label: `Valutare disdetta ${s.name}`, href: "/utile" });
      return list;
    }),
    ...webDetails.flatMap((d) => {
      const list: CalendarEvent[] = [];
      const inRange = (x: Date | null): x is Date =>
        !!x && x >= gridStart && x <= gridEnd;
      if (inRange(d.domainExpiry))
        list.push({ date: d.domainExpiry, type: "web", label: `Dominio ${d.domainName ?? ""}`.trim(), sublabel: d.project.name, href: `/progetti/${d.project.id}` });
      if (inRange(d.hostingExpiry))
        list.push({ date: d.hostingExpiry, type: "web", label: `Hosting ${d.hostingProvider ?? ""}`.trim(), sublabel: d.project.name, href: `/progetti/${d.project.id}` });
      if (inRange(d.sslExpiry))
        list.push({ date: d.sslExpiry, type: "web", label: "SSL", sublabel: d.project.name, href: `/progetti/${d.project.id}` });
      return list;
    }),
  ].filter((e) => activeTypes.has(e.type));

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const monthParam = (d: Date) => format(d, "yyyy-MM");

  // Link che mantiene i filtri cambiando mese, e viceversa.
  const urlFor = (m: Date, types: Set<EventType>) => {
    const params = new URLSearchParams();
    params.set("mese", monthParam(m));
    if (types.size < Object.keys(EVENT_TYPES).length) {
      params.set("tipi", [...types].join(","));
    }
    return `/calendario?${params.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Calendario"
        subtitle="Post social, task, deadline e scadenze tecniche di tutti i progetti"
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={urlFor(addMonths(month, -1), activeTypes)} aria-label="Mese precedente">
              <ChevronLeft />
            </Link>
          </Button>
          <p className="min-w-36 text-center font-semibold capitalize">
            {format(month, "MMMM yyyy", { locale: it })}
          </p>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={urlFor(addMonths(month, 1), activeTypes)} aria-label="Mese successivo">
              <ChevronRight />
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Filtri per tipo: badge cliccabili che attivano/disattivano */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(EVENT_TYPES) as EventType[]).map((type) => {
          const active = activeTypes.has(type);
          const next = new Set(activeTypes);
          if (active) next.delete(type);
          else next.add(type);
          return (
            <Link
              key={type}
              href={urlFor(month, next)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-opacity",
                EVENT_TYPES[type].chip,
                !active && "opacity-40"
              )}
            >
              {EVENT_TYPES[type].label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
              <div
                key={d}
                className="bg-muted px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {days.map((day) => {
              const dayEvents = events
                .filter((e) => isSameDay(e.date, day))
                .sort((a, b) => a.type.localeCompare(b.type));
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-28 bg-card p-1.5",
                    !isSameMonth(day, month) && "bg-muted/40 text-muted-foreground"
                  )}
                >
                  <p
                    className={cn(
                      "text-right text-xs",
                      isToday(day) &&
                        "ml-auto flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </p>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 4).map((event, i) => (
                      <Link
                        key={i}
                        href={event.href}
                        title={
                          event.sublabel ? `${event.label} — ${event.sublabel}` : event.label
                        }
                        className={cn(
                          "block truncate rounded-md px-1.5 py-0.5 text-xs font-medium hover:opacity-80",
                          EVENT_TYPES[event.type].chip
                        )}
                      >
                        {event.label}
                      </Link>
                    ))}
                    {dayEvents.length > 4 ? (
                      <p className="px-1.5 text-xs text-muted-foreground">
                        +{dayEvents.length - 4} altri
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
