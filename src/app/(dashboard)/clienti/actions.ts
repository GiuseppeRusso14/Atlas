"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { actionError, type ActionResult } from "@/lib/action-result";
import { ClientStatus } from "@/generated/prisma/enums";

const clientSchema = z.object({
  name: z.string().trim().min(1, "La ragione sociale è obbligatoria"),
  vatNumber: z.string().trim().max(20).optional(),
  fiscalCode: z.string().trim().max(20).optional(),
  email: z.email("Email non valida").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  website: z.url("URL non valido (usa https://…)").optional().or(z.literal("")),
  address: z.string().trim().max(200).optional(),
  status: z.enum(ClientStatus),
  tags: z.string().optional(), // separati da virgola
  notes: z.string().optional(),
});

/** FormData → oggetto pronto per Prisma (stringhe vuote → null). */
function parseClientForm(formData: FormData) {
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false as const,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const d = parsed.data;
  const nullable = (v: string | undefined) => (v && v.length > 0 ? v : null);
  return {
    success: true as const,
    data: {
      name: d.name,
      vatNumber: nullable(d.vatNumber),
      fiscalCode: nullable(d.fiscalCode),
      email: nullable(d.email),
      phone: nullable(d.phone),
      website: nullable(d.website),
      address: nullable(d.address),
      status: d.status,
      tags: (d.tags ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: nullable(d.notes),
    },
  };
}

export async function createClientAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  const client = await prisma.client.create({ data: parsed.data });
  await logActivity(user.id, "ha creato il cliente", "Client", client.id);
  revalidatePath("/clienti");
  redirect(`/clienti/${client.id}`);
}

export async function updateClientAction(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  await prisma.client.update({ where: { id: clientId }, data: parsed.data });
  await logActivity(user.id, "ha aggiornato l'anagrafica", "Client", clientId);
  revalidatePath("/clienti");
  revalidatePath(`/clienti/${clientId}`);
  redirect(`/clienti/${clientId}`);
}

/** Archiviazione (stato CLOSED): consentita anche ai MEMBER. */
export async function archiveClientAction(clientId: string): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.client.update({
    where: { id: clientId },
    data: { status: "CLOSED" },
  });
  await logActivity(user.id, "ha archiviato il cliente", "Client", clientId);
  revalidatePath("/clienti");
  revalidatePath(`/clienti/${clientId}`);
  return { ok: true };
}

/** Eliminazione definitiva: solo ADMIN (enforcement lato server). */
export async function deleteClientAction(clientId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return actionError("Solo l'amministratore può eliminare i clienti.");
  }
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/clienti");
  redirect("/clienti");
}

// ---------- Contatti ----------
const contactSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio"),
  position: z.string().trim().optional(),
  email: z.email("Email non valida").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
});

export async function addContactAction(
  clientId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireUser();
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const isPrimary = formData.get("isPrimary") === "on";

  if (isPrimary) {
    // Un solo contatto primario per cliente.
    await prisma.contact.updateMany({
      where: { clientId },
      data: { isPrimary: false },
    });
  }
  await prisma.contact.create({
    data: {
      clientId,
      name: d.name,
      position: d.position || null,
      email: d.email || null,
      phone: d.phone || null,
      isPrimary,
    },
  });
  revalidatePath(`/clienti/${clientId}`);
  return { ok: true };
}

export async function deleteContactAction(
  contactId: string
): Promise<ActionResult> {
  await requireUser();
  const contact = await prisma.contact.delete({ where: { id: contactId } });
  revalidatePath(`/clienti/${contact.clientId}`);
  return { ok: true };
}
