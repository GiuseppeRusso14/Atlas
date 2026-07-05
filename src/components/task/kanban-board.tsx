"use client";

import { useOptimistic, useState, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { DeleteIconButton } from "@/components/delete-icon-button";
import { TaskDialog } from "@/components/task/task-dialog";
import {
  deleteTaskAction,
  moveTaskAction,
  saveTaskAction,
} from "@/app/(dashboard)/task/actions";
import { PRIORITY, TASK_STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/generated/prisma/client";

const COLUMNS = Object.keys(TASK_STATUS) as TaskStatus[];

export type KanbanTask = Task & {
  project: { id: string; name: string };
  assignee: { id: string; name: string } | null;
};

type Option = { id: string; name: string };

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Kanban con drag & drop nativo HTML5 (nessuna dipendenza aggiuntiva):
 * lo spostamento aggiorna subito la UI (useOptimistic) e persiste via
 * Server Action.
 */
export function KanbanBoard({
  tasks,
  projects,
  users,
}: {
  tasks: KanbanTask[];
  projects: Option[];
  users: Option[];
}) {
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [optimisticTasks, applyMove] = useOptimistic(
    tasks,
    (current, move: { taskId: string; status: TaskStatus }) =>
      current.map((t) => (t.id === move.taskId ? { ...t, status: move.status } : t))
  );

  function handleDrop(status: TaskStatus, e: React.DragEvent) {
    e.preventDefault();
    setDragOver(null);
    const taskId = e.dataTransfer.getData("text/plain");
    const task = optimisticTasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    startTransition(async () => {
      applyMove({ taskId, status });
      const result = await moveTaskAction(taskId, status);
      if (result?.ok === false) {
        toast.error(result.error ?? "Spostamento non riuscito.");
      }
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((status) => {
        const columnTasks = optimisticTasks.filter((t) => t.status === status);
        return (
          <section
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(status, e)}
            className={cn(
              "flex min-h-64 flex-col gap-3 rounded-xl bg-muted/60 p-3 transition-colors",
              dragOver === status && "bg-accent ring-2 ring-primary/40"
            )}
          >
            <header className="flex items-center justify-between px-1">
              <StatusBadge {...TASK_STATUS[status]} />
              <span className="text-xs font-semibold text-muted-foreground">
                {columnTasks.length}
              </span>
            </header>

            {columnTasks.map((task) => (
              <article
                key={task.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                className="group cursor-grab space-y-2 rounded-xl bg-card p-3 shadow-sm active:cursor-grabbing"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug">{task.title}</p>
                  <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <TaskDialog
                      action={saveTaskAction.bind(null, task.id)}
                      task={task}
                      projects={projects}
                      users={users}
                    />
                    <DeleteIconButton
                      action={deleteTaskAction.bind(null, task.id)}
                      ariaLabel={`Elimina ${task.title}`}
                    />
                  </div>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {task.project.name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn("border-transparent", PRIORITY[task.priority].className)}
                  >
                    {PRIORITY[task.priority].label}
                  </Badge>
                  {task.dueDate ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="size-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  ) : null}
                  {task.assignee ? (
                    <Avatar className="ml-auto size-6" title={task.assignee.name}>
                      <AvatarFallback className="bg-accent text-[10px] font-semibold">
                        {initials(task.assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                </div>
              </article>
            ))}

            {columnTasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                Trascina qui un task
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
