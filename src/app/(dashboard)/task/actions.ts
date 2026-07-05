"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { actionError, type ActionResult } from "@/lib/action-result";
import { Priority, TaskStatus } from "@/generated/prisma/enums";
import { TASK_STATUS } from "@/lib/labels";

const NONE = "__none__"; // valore sentinella per "nessun assegnatario"

const taskSchema = z.object({
  title: z.string().trim().min(1, "Il titolo è obbligatorio"),
  projectId: z.string().min(1, "Seleziona un progetto"),
  status: z.enum(TaskStatus),
  priority: z.enum(Priority),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  description: z.string().optional(),
});

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
    description: d.description?.trim() || null,
  };

  if (taskId) {
    await prisma.task.update({ where: { id: taskId }, data });
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
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: status as keyof typeof TaskStatus },
  });
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

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  await requireUser();
  const task = await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/task");
  revalidatePath(`/progetti/${task.projectId}`);
  return { ok: true };
}
