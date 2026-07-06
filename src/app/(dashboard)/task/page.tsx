import Link from "next/link";
import { KanbanSquare, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { KanbanBoard } from "@/components/task/kanban-board";
import { TaskDialog } from "@/components/task/task-dialog";
import { TaskTrashActions } from "@/components/task/task-trash-actions";
import { StatusBadge } from "@/components/status-badge";
import { PRIORITY, REPARTO_LABEL, TASK_STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { saveTaskAction } from "./actions";
import type { Priority, Prisma, Reparto } from "@/generated/prisma/client";

export const metadata = { title: "Task" };

type SearchParams = Promise<{
  progetto?: string;
  assegnatario?: string;
  priorita?: string;
  reparto?: string;
  vista?: string;
}>;

export default async function TaskPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { progetto, assegnatario, priorita, reparto, vista } = await searchParams;
  const isTrash = vista === "cestino";

  const where: Prisma.TaskWhereInput = { deletedAt: null };
  if (progetto) where.projectId = progetto;
  if (assegnatario) where.assigneeId = assegnatario;
  if (priorita && priorita in PRIORITY) where.priority = priorita as Priority;
  if (reparto && reparto in REPARTO_LABEL)
    where.assignee = { reparto: reparto as Reparto };

  const [tasks, trashedTasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    }),
    prisma.task.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      include: { project: { select: { id: true, name: true } } },
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
      <PageHeader
        title="Task"
        subtitle={isTrash ? `${trashedTasks.length} nel cestino` : `${tasks.length} task`}
      >
        <div className="flex items-center gap-2">
          <Button variant={isTrash ? "outline" : "secondary"} size="sm" asChild>
            <Link href="/task">
              <KanbanSquare data-icon="inline-start" /> Kanban
            </Link>
          </Button>
          <Button variant={isTrash ? "secondary" : "outline"} size="sm" asChild>
            <Link href="/task?vista=cestino">
              <Trash2 data-icon="inline-start" /> Cestino
              {trashedTasks.length > 0 ? ` (${trashedTasks.length})` : ""}
            </Link>
          </Button>
          <TaskDialog
            action={saveTaskAction.bind(null, null)}
            projects={projects}
            users={users}
          />
        </div>
      </PageHeader>

      {isTrash ? (
        <Card>
          <CardContent>
            {trashedTasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Il cestino è vuoto.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Progetto</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Cestinato il</TableHead>
                    <TableHead className="w-56" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trashedTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell className="text-sm">{task.project.name}</TableCell>
                      <TableCell>
                        <StatusBadge {...TASK_STATUS[task.status]} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(task.deletedAt)}
                      </TableCell>
                      <TableCell>
                        <TaskTrashActions taskId={task.id} title={task.title} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {isTrash ? null : (
      <>

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
      )}
    </>
  );
}
