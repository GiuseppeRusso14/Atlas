"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/lib/action-result";

const timeEntrySchema = z.object({
  projectId: z.string().min(1, "Seleziona un progetto"),
  hours: z.coerce.number().min(0).max(24).default(0),
  minutes: z.coerce.number().min(0).max(59).default(0),
  date: z.string().min(1, "La data è obbligatoria"),
  note: z.string().optional(),
});

export async function addTimeEntryAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = timeEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const totalMinutes = Math.round(d.hours * 60 + d.minutes);
  if (totalMinutes <= 0) {
    return { ok: false, fieldErrors: { hours: ["Inserisci una durata"] } };
  }

  // Le ore vengono registrate sempre a nome dell'utente corrente.
  await prisma.timeEntry.create({
    data: {
      userId: user.id,
      projectId: d.projectId,
      minutes: totalMinutes,
      date: new Date(d.date),
      note: d.note?.trim() || null,
    },
  });
  await logActivity(user.id, "ha registrato delle ore", "Project", d.projectId);
  revalidatePath("/ore");
  revalidatePath(`/progetti/${d.projectId}`);
  return { ok: true };
}

export async function deleteTimeEntryAction(entryId: string): Promise<ActionResult> {
  const user = await requireUser();
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { ok: true };
  // Ognuno può cancellare solo le proprie registrazioni; l'ADMIN tutte.
  if (user.role !== "ADMIN" && entry.userId !== user.id) {
    return { ok: false, error: "Puoi eliminare solo le tue registrazioni." };
  }
  await prisma.timeEntry.delete({ where: { id: entryId } });
  revalidatePath("/ore");
  revalidatePath(`/progetti/${entry.projectId}`);
  return { ok: true };
}
