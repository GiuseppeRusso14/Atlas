import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { KanbanBoard } from "@/components/task/kanban-board";
import { TaskDialog } from "@/components/task/task-dialog";
import { PRIORITY, REPARTO_LABEL } from "@/lib/labels";
import { saveTaskAction } from "./actions";
import type { Priority, Prisma, Reparto } from "@/generated/prisma/client";

export const metadata = { title: "Task" };

type SearchParams = Promise<{
  progetto?: string;
  assegnatario?: string;
  priorita?: string;
  reparto?: string;
}>;

export default async function TaskPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { progetto, assegnatario, priorita, reparto } = await searchParams;

  const where: Prisma.TaskWhereInput = {};
  if (progetto) where.projectId = progetto;
  if (assegnatario) where.assigneeId = assegnatario;
  if (priorita && priorita in PRIORITY) where.priority = priorita as Priority;
  if (reparto && reparto in REPARTO_LABEL)
    where.assignee = { reparto: reparto as Reparto };

  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    }),
    prisma.project.findMany({
      where: { status: { not: "ARCHIVIATO" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageHeader title="Task" subtitle={`${tasks.length} task`}>
        <TaskDialog
          action={saveTaskAction.bind(null, null)}
          projects={projects}
          users={users}
        />
      </PageHeader>

      <div className="mb-4">
        <FilterBar
          filters={[
            {
              param: "progetto",
              label: "Progetto",
              options: projects.map((p) => ({ value: p.id, label: p.name })),
            },
            {
              param: "assegnatario",
              label: "Assegnatario",
              options: users.map((u) => ({ value: u.id, label: u.name })),
            },
            {
              param: "reparto",
              label: "Reparto",
              options: Object.entries(REPARTO_LABEL).map(([value, label]) => ({
                value,
                label,
              })),
            },
            {
              param: "priorita",
              label: "Priorità",
              options: Object.entries(PRIORITY).map(([value, p]) => ({
                value,
                label: p.label,
              })),
            },
          ]}
        />
      </div>

      <KanbanBoard tasks={tasks} projects={projects} users={users} />
    </>
  );
}
