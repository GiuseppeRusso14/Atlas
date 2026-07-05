import Link from "next/link";
import { redirect } from "next/navigation";
import { endOfWeek, startOfWeek } from "date-fns";
import { CalendarClock, Clock, FolderKanban } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PersonalTodos } from "@/components/mio-lavoro/personal-todos";
import { PersonalNotes } from "@/components/mio-lavoro/personal-notes";
import { WorkUserPicker } from "@/components/mio-lavoro/work-user-picker";
import { AREA_LABEL, PRIORITY, PROJECT_STATUS, TASK_STATUS } from "@/lib/labels";
import { formatDate, formatMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Il mio lavoro" };

export default async function MioLavoroPage({
  searchParams,
}: {
  searchParams: Promise<{ utente?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/sign-in");

  const { utente } = await searchParams;
  const isAdmin = me.role === "ADMIN";

  // L'ADMIN può vedere la board di un altro utente (?utente=…); i MEMBER solo
  // la propria. Quando si guarda quella altrui è tutto in sola lettura.
  let viewedUser = me;
  if (isAdmin && utente && utente !== me.id) {
    const target = await prisma.user.findUnique({ where: { id: utente } });
    if (target) viewedUser = target;
  }
  const viewingOther = viewedUser.id !== me.id;

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [users, myTasks, myProjects, weekMinutes, todos, notes] = await Promise.all([
    isAdmin
      ? prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
    prisma.task.findMany({
      where: { assigneeId: viewedUser.id, status: { not: "FATTO" } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.project.findMany({
      where: {
        members: { some: { id: viewedUser.id } },
        status: { notIn: ["COMPLETATO", "ARCHIVIATO"] },
      },
      orderBy: { deadline: "asc" },
      select: { id: true, name: true, area: true, status: true, deadline: true },
    }),
    prisma.timeEntry.aggregate({
      where: { userId: viewedUser.id, date: { gte: weekStart, lte: weekEnd } },
      _sum: { minutes: true },
    }),
    prisma.personalTodo.findMany({
      where: { userId: viewedUser.id },
      orderBy: [{ done: "asc" }, { createdAt: "asc" }],
    }),
    prisma.personalNote.findMany({
      where: { userId: viewedUser.id },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const firstName = viewedUser.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={viewingOther ? `Lavoro di ${viewedUser.name}` : `Ciao, ${firstName}`}
        subtitle={
          viewingOther
            ? "Stai vedendo la board di un membro del team"
            : "I tuoi task, progetti, ore e appunti personali"
        }
      >
        {isAdmin ? <WorkUserPicker users={users} value={viewedUser.id} /> : null}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Colonna principale: task + progetti */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard
              label="Ore questa settimana"
              value={formatMinutes(weekMinutes._sum.minutes ?? 0)}
              icon={Clock}
              highlight
            />
            <KpiCard label="Task aperti" value={myTasks.length} icon={FolderKanban} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>I miei task</CardTitle>
            </CardHeader>
            <CardContent>
              {myTasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nessun task assegnato. 🎉
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {myTasks.map((task) => {
                    const overdue = task.dueDate && task.dueDate < now;
                    return (
                      <li key={task.id} className="flex items-center gap-3 py-2.5">
                        <StatusBadge {...TASK_STATUS[task.status]} />
                        <Link
                          href={`/task?progetto=${task.project.id}`}
                          className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                        >
                          {task.title}
                        </Link>
                        <StatusBadge {...PRIORITY[task.priority]} />
                        <span className="w-28 shrink-0 text-xs text-muted-foreground">
                          {task.project.name}
                        </span>
                        {task.dueDate ? (
                          <span
                            className={cn(
                              "flex w-24 shrink-0 items-center gap-1 text-xs",
                              overdue ? "font-medium text-destructive" : "text-muted-foreground"
                            )}
                          >
                            <CalendarClock className="size-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span className="w-24 shrink-0" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <PersonalTodos todos={todos} readOnly={viewingOther} />
        </div>

        {/* Colonna laterale: progetti + note */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>I miei progetti</CardTitle>
            </CardHeader>
            <CardContent>
              {myProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun progetto attivo.</p>
              ) : (
                <ul className="space-y-3">
                  {myProjects.map((project) => (
                    <li key={project.id}>
                      <Link
                        href={`/progetti/${project.id}`}
                        className="font-medium hover:underline"
                      >
                        {project.name}
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge {...PROJECT_STATUS[project.status]} />
                        <span className="text-xs text-muted-foreground">
                          {AREA_LABEL[project.area]}
                          {project.deadline ? ` · ${formatDate(project.deadline)}` : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <PersonalNotes notes={notes} readOnly={viewingOther} />
        </div>
      </div>
    </>
  );
}
