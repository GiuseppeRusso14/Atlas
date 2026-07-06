"use server";

import { revalidatePath } from "next/cache";
import { addMonths, addWeeks } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { actionError, type ActionResult } from "@/lib/action-result";
import { Priority, Recurrence } from "@/generated/prisma/enums";

/** Prossima occorrenza di una ricorrenza, a partire dalla scadenza (o da oggi). */
function nextOccurrence(repeat: keyof typeof Recurrence, from: Date | null): Date {
  const base = from ?? new Date();
  return repeat === "SETTIMANALE" ? addWeeks(base, 1) : addMonths(base, 1);
}

/**
 * To-do e note SEMPRE dell'utente corrente: le mutazioni non accettano un
 * userId dall'esterno, così nessuno (nemmeno l'ADMIN) può scrivere sugli
 * elementi altrui. L'ADMIN può solo VEDERLI (via ?utente sulla pagina).
 */

// ---------- To-do personali ----------
const todoSchema = z.object({
  title: z.string().trim().min(1, "Scrivi qualcosa"),
  dueDate: z.string().optional(),
  repeat: z.string().optional(),
});

export async function addTodoAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = todoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const repeat =
    parsed.data.repeat && parsed.data.repeat in Recurrence
      ? (parsed.data.repeat as keyof typeof Recurrence)
      : null;
  await prisma.personalTodo.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      repeat,
    },
  });
  revalidatePath("/mio-lavoro");
  return { ok: true };
}

export async function toggleTodoAction(todoId: string): Promise<ActionResult> {
  const user = await requireUser();
  const todo = await prisma.personalTodo.findUnique({ where: { id: todoId } });
  if (!todo || todo.userId !== user.id) {
    return actionError("Elemento non trovato.");
  }
  await prisma.personalTodo.update({
    where: { id: todoId },
    data: { done: !todo.done },
  });
  // Ricorrenza: alla spunta nasce l'occorrenza successiva (da fare).
  if (!todo.done && todo.repeat) {
    await prisma.personalTodo.create({
      data: {
        userId: user.id,
        title: todo.title,
        dueDate: nextOccurrence(todo.repeat, todo.dueDate),
        repeat: todo.repeat,
      },
    });
  }
  revalidatePath("/mio-lavoro");
  return { ok: true };
}

// ---------- Promozione: to-do personale → task di progetto ----------
const promoteSchema = z.object({
  projectId: z.string().min(1, "Seleziona un progetto"),
  priority: z.enum(Priority),
});

export async function promoteTodoAction(
  todoId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const todo = await prisma.personalTodo.findUnique({ where: { id: todoId } });
  if (!todo || todo.userId !== user.id) {
    return actionError("Elemento non trovato.");
  }
  const parsed = promoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const task = await prisma.task.create({
    data: {
      projectId: parsed.data.projectId,
      title: todo.title,
      status: "TODO",
      priority: parsed.data.priority,
      assigneeId: user.id,
      dueDate: todo.dueDate,
      repeat: todo.repeat,
      description: "Promosso da una to-do personale.",
    },
  });
  await prisma.personalTodo.delete({ where: { id: todoId } });
  await logActivity(user.id, `ha creato il task "${task.title}"`, "Project", task.projectId);
  revalidatePath("/mio-lavoro");
  revalidatePath("/task");
  return { ok: true };
}

export async function deleteTodoAction(todoId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await prisma.personalTodo.deleteMany({
    where: { id: todoId, userId: user.id },
  });
  if (result.count === 0) return actionError("Elemento non trovato.");
  revalidatePath("/mio-lavoro");
  return { ok: true };
}

/** Elimina in blocco le to-do già completate. */
export async function clearDoneTodosAction(): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.personalTodo.deleteMany({ where: { userId: user.id, done: true } });
  revalidatePath("/mio-lavoro");
  return { ok: true };
}

// ---------- Note personali ----------
const noteSchema = z.object({
  title: z.string().trim().min(1, "Il titolo è obbligatorio"),
  content: z.string().trim().min(1, "Scrivi il contenuto della nota"),
});

export async function saveNoteAction(
  noteId: string | null,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = noteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { title, content } = parsed.data;

  if (noteId) {
    // Aggiorna solo se la nota è mia.
    const result = await prisma.personalNote.updateMany({
      where: { id: noteId, userId: user.id },
      data: { title, content },
    });
    if (result.count === 0) return actionError("Nota non trovata.");
  } else {
    await prisma.personalNote.create({
      data: { userId: user.id, title, content },
    });
  }
  revalidatePath("/mio-lavoro");
  return { ok: true };
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await prisma.personalNote.deleteMany({
    where: { id: noteId, userId: user.id },
  });
  if (result.count === 0) return actionError("Nota non trovata.");
  revalidatePath("/mio-lavoro");
  return { ok: true };
}
