import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, Pencil, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { StatusBadge } from "@/components/status-badge";
import { ActivityFeed } from "@/components/activity-feed";
import { ResourceSection } from "@/components/resources/resource-section";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { WebDetailForm } from "@/components/progetti/web-detail-form";
import { GraphicSection } from "@/components/progetti/graphic-section";
import { SocialSection } from "@/components/progetti/social-section";
import {
  AREA_LABEL,
  PAYMENT_STATUS,
  PROJECT_STATUS,
  REPARTO_LABEL,
  TASK_STATUS,
} from "@/lib/labels";
import { formatCurrency, formatDate, formatMinutes } from "@/lib/format";
import {
  archiveProjectAction,
  deleteProjectAction,
  upsertWebDetailAction,
} from "../actions";

export const metadata = { title: "Dettaglio progetto" };

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function ProgettoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string; mese?: string }>;
}) {
  const [{ id }, { vista, mese }] = await Promise.all([params, searchParams]);
  const [user, project] = await Promise.all([
    getCurrentUser(),
    prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        members: true,
        webDetail: true,
        graphicItems: { orderBy: { createdAt: "desc" } },
        socialPosts: { orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }] },
        resources: { orderBy: { createdAt: "desc" } },
        tasks: {
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 8,
          include: { assignee: true },
        },
        timeEntries: { include: { user: true } },
      },
    }),
  ]);
  if (!project) notFound();

  const isAdmin = user?.role === "ADMIN";
  const activities = await prisma.activityLog.findMany({
    where: { entityType: "Project", entityId: project.id },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  // Riepilogo ore per utente sul progetto.
  const minutesByUser = new Map<string, { name: string; minutes: number }>();
  for (const entry of project.timeEntries) {
    const current = minutesByUser.get(entry.userId) ?? {
      name: entry.user.name,
      minutes: 0,
    };
    current.minutes += entry.minutes;
    minutesByUser.set(entry.userId, current);
  }
  const totalMinutes = project.timeEntries.reduce((s, e) => s + e.minutes, 0);

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Progetti", href: "/progetti" }, { label: project.name }]}
      />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clienti/${project.clientId}`} className="hover:underline">
              {project.client.name}
            </Link>{" "}
            · {AREA_LABEL[project.area]}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <StatusBadge {...PROJECT_STATUS[project.status]} />
            <StatusBadge {...PAYMENT_STATUS[project.paymentStatus]} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/progetti/${project.id}/modifica`}>
              <Pencil data-icon="inline-start" /> Modifica
            </Link>
          </Button>
          {project.status !== "ARCHIVIATO" ? (
            <ConfirmActionButton
              action={archiveProjectAction.bind(null, project.id)}
              label={
                <>
                  <Archive data-icon="inline-start" /> Archivia
                </>
              }
              title="Archiviare il progetto?"
              description="Il progetto passa in stato Archiviato; potrai riattivarlo dalla modifica."
              confirmLabel="Archivia"
              successMessage="Progetto archiviato."
            />
          ) : null}
          {isAdmin ? (
            <ConfirmActionButton
              action={deleteProjectAction.bind(null, project.id)}
              label={
                <>
                  <Trash2 data-icon="inline-start" /> Elimina
                </>
              }
              variant="destructive"
              title="Eliminare definitivamente il progetto?"
              description="Verranno eliminati anche task, ore, note e dettagli area. Operazione non reversibile."
              confirmLabel="Elimina definitivamente"
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Colonna principale */}
        <div className="space-y-4 lg:col-span-2">
          {/* Sezione specifica per area */}
          {project.area === "WEB" ? (
            <WebDetailForm
              action={upsertWebDetailAction.bind(null, project.id)}
              detail={project.webDetail}
            />
          ) : null}
          {project.area === "GRAFICA" ? (
            <GraphicSection projectId={project.id} deliverables={project.graphicItems} />
          ) : null}
          {project.area === "SOCIAL" ? (
            <SocialSection
              projectId={project.id}
              posts={project.socialPosts}
              vista={vista}
              mese={mese}
            />
          ) : null}

          {/* Task recenti del progetto */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Task</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/task?progetto=${project.id}`}>Vai al Kanban</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {project.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun task.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {project.tasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-3 py-2.5">
                      <StatusBadge {...TASK_STATUS[task.status]} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {task.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {task.assignee?.name.split(" ")[0] ?? "—"}
                        {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <ResourceSection
            resources={project.resources}
            parent={{ projectId: project.id }}
          />
        </div>

        {/* Colonna laterale */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Inizio</dt>
                <dd>{formatDate(project.startDate)}</dd>
                <dt className="text-muted-foreground">Deadline</dt>
                <dd>{formatDate(project.deadline)}</dd>
                <dt className="text-muted-foreground">Budget</dt>
                <dd>{formatCurrency(project.budget)}</dd>
                <dt className="text-muted-foreground">Ore totali</dt>
                <dd>{totalMinutes > 0 ? formatMinutes(totalMinutes) : "—"}</dd>
              </dl>
              {project.description ? (
                <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                  {project.description}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Membri</CardTitle>
            </CardHeader>
            <CardContent>
              {project.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun membro assegnato.</p>
              ) : (
                <ul className="space-y-3">
                  {project.members.map((member) => (
                    <li key={member.id} className="flex items-center gap-3">
                      <Avatar className="size-9">
                        {member.avatarUrl ? (
                          <AvatarImage src={member.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="bg-accent text-xs font-semibold">
                          {initials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        {member.reparto ? (
                          <p className="text-xs text-muted-foreground">
                            {REPARTO_LABEL[member.reparto]}
                          </p>
                        ) : null}
                      </div>
                      {minutesByUser.has(member.id) ? (
                        <Badge variant="outline" className="ml-auto">
                          {formatMinutes(minutesByUser.get(member.id)!.minutes)}
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attività recenti</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed activities={activities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
