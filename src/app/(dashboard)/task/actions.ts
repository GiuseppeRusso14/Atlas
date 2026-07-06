"use server";

import { revalidatePath } from "next/cache";
import { addMonths, addWeeks } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { actionError, type ActionResult } from "@/lib/action-result";
import { Priority, Recurrence, TaskStatus } from "@/generated/prisma/enums";
import { TASK_STATUS } from "@/lib/labels";
import type { Task } from "@/generated/prisma/client";

const NONE = "__none__"; // valore sentinella per "nessuno"

const taskSchema = z.object({
  title: z.string().trim().min(1, "Il titolo è obbligatorio"),
  projectId: z.string().min(1, "Seleziona un progetto"),
  status: z.enum(TaskStatus),
  priority: z.enum(Priority),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  repeat: z.string().optional(),
  description: z.string().optional(),
});

/** Task ricorrente completato → nasce l'occorrenza successiva (in Todo). */
async function spawnNextOccurrence(task: Task): Promise<void> {
  if (!task.repeat) return;
  const base = task.dueDate ?? new Date();
  const nextDue =
    task.repeat === "SETTIMANALE" ? addWeeks(base, 1) : addMonths(base, 1);
  await prisma.task.create({
    data: {
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: "TODO",
      priority: task.priority,
      assigneeId: task.assigneeId,
      dueDate: nextDue,
      repeat: task.repeat,
    },
  });
}

export async function saveTaskAction(
  taskId: string | null,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const data = {
    title: d.title,
    projectId: d.projectId,
    status: d.status,
    priority: d.priority,
    assigneeId: d.assigneeId && d.assigneeId !== NONE ? d.assigneeId : null,
    dueDate: d.dueDate ? new Date(d.dueDate) : null,
    repeat:
      d.repeat && d.repeat in Recurrence
        ? (d.repeat as keyof typeof Recurrence)
        : null,
    description: d.description?.trim() || null,
  };

  if (taskId) {
    const before = await prisma.task.findUnique({ where: { id: taskId } });
    const updated = await prisma.task.update({ where: { id: taskId }, data });
    // Ricorrenza: se col salvataggio il task è passato a FATTO, rigenera.
    if (before && before.status !== "FATTO" && updated.status === "FATTO") {
      await spawnNextOccurrence(updated);
    }
    await logActivity(user.id, `ha aggiornato il task "${d.title}"`, "Project", d.projectId);
  } else {
    await prisma.task.create({ data });
    await logActivity(user.id, `ha creato il task "${d.title}"`, "Project", d.projectId);
  }
  revalidatePath("/task");
  revalidatePath(`/progetti/${d.projectId}`);
  return { ok: true };
}

/** Cambio colonna dal Kanban (drag & drop). */
export async function moveTaskAction(
  taskId: string,
  status: string
): Promise<ActionResult> {
  const user = await requireUser();
  if (!(status in TaskStatus)) return actionError("Stato non valido.");
  const before = await prisma.task.findUnique({ where: { id: taskId } });
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: status as keyof typeof TaskStatus },
  });
  // Ricorrenza: trascinato in "Fatto" → nasce l'occorrenza successiva.
  if (before && before.status !== "FATTO" && task.status === "FATTO") {
    await spawnNextOccurrence(task);
  }
  await logActivity(
    user.id,
    `ha spostato "${task.title}" in ${TASK_STATUS[task.status].label}`,
    "Project",
    task.projectId
  );
  revalidatePath("/task");
  revalidatePath(`/progetti/${task.projectId}`);
  return { ok: true };
}

/** Cestina (soft-delete): il task sparisce dal Kanban ma resta ripristinabile. */
export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  const user = await requireUser();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date() },
  });
  await logActivity(user.id, `ha cestinato il task "${task.title}"`, "Project", task.projectId);
  revalidatePath("/task");
  revalidatePath(`/progetti/${task.projectId}`);
  return { ok: true };
}

/** Ripristina un task dal cestino (torna nel Kanban col suo stato). */
export async function restoreTaskAction(taskId: string): Promise<ActionResult> {
  const user = await requireUser();
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: null },
  });
  await logActivity(user.id, `ha ripristinato il task "${task.title}"`, "Project", task.projectId);
  revalidatePath("/task");
  revalidatePath(`/progetti/${task.projectId}`);
  return { ok: true };
}

/** Eliminazione definitiva dal cestino (non reversibile). */
export async function hardDeleteTaskAction(taskId: string): Promise<ActionResult> {
  await requireUser();
  const task = await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/task");
  revalidatePath(`/progetti/${task.projectId}`);
  return { ok: true };
}
