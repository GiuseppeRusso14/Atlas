"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { actionError, type ActionResult } from "@/lib/action-result";
import { QuoteStatus } from "@/generated/prisma/enums";
import { QUOTE_STATUS } from "@/lib/labels";

const NONE = "__none__";

const quoteSchema = z.object({
  clientId: z.string().min(1, "Seleziona un cliente"),
  projectId: z.string().optional(),
  status: z.enum(QuoteStatus),
  issuedDate: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

type QuoteItemInput = { description: string; quantity: number; unitPrice: number };

/** Estrae e valida le righe del preventivo (array paralleli nel FormData). */
function parseItems(formData: FormData):
  | { success: true; items: QuoteItemInput[] }
  | { success: false; error: string } {
  const descriptions = formData.getAll("itemDescription").map(String);
  const quantities = formData.getAll("itemQuantity").map(String);
  const prices = formData.getAll("itemUnitPrice").map(String);

  const items: QuoteItemInput[] = [];
  for (let i = 0; i < descriptions.length; i++) {
    const description = descriptions[i].trim();
    if (!description) continue; // riga vuota: ignorata
    const quantity = Number((quantities[i] ?? "1").replace(",", "."));
    const unitPrice = Number((prices[i] ?? "0").replace(",", "."));
    if (Number.isNaN(quantity) || quantity <= 0) {
      return { success: false, error: `Quantità non valida alla riga ${i + 1}` };
    }
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      return { success: false, error: `Prezzo non valido alla riga ${i + 1}` };
    }
    items.push({ description, quantity, unitPrice });
  }
  if (items.length === 0) {
    return { success: false, error: "Aggiungi almeno una riga al preventivo" };
  }
  return { success: true, items };
}

/** Progressivo per anno: "2026-0001", "2026-0002", … */
async function nextQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.quote.findFirst({
    where: { number: { startsWith: `${year}-` } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const lastSeq = last ? Number(last.number.split("-")[1]) : 0;
  return `${year}-${String(lastSeq + 1).padStart(4, "0")}`;
}

export async function createQuoteAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const items = parseItems(formData);
  if (!items.success) return actionError(items.error);

  const d = parsed.data;
  const quote = await prisma.quote.create({
    data: {
      clientId: d.clientId,
      projectId: d.projectId && d.projectId !== NONE ? d.projectId : null,
      number: await nextQuoteNumber(),
      status: d.status,
      issuedDate: d.issuedDate ? new Date(d.issuedDate) : null,
      validUntil: d.validUntil ? new Date(d.validUntil) : null,
      notes: d.notes?.trim() || null,
      items: { create: items.items },
    },
  });
  await logActivity(user.id, `ha creato il preventivo ${quote.number}`, "Client", d.clientId);
  revalidatePath("/preventivi");
  redirect(`/preventivi/${quote.id}`);
}

export async function updateQuoteAction(
  quoteId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const items = parseItems(formData);
  if (!items.success) return actionError(items.error);

  const d = parsed.data;
  // Le righe vengono riscritte in blocco: più semplice e sempre coerente.
  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      clientId: d.clientId,
      projectId: d.projectId && d.projectId !== NONE ? d.projectId : null,
      status: d.status,
      issuedDate: d.issuedDate ? new Date(d.issuedDate) : null,
      validUntil: d.validUntil ? new Date(d.validUntil) : null,
      notes: d.notes?.trim() || null,
      items: { deleteMany: {}, create: items.items },
    },
  });
  await logActivity(user.id, `ha aggiornato il preventivo ${quote.number}`, "Client", d.clientId);
  revalidatePath("/preventivi");
  revalidatePath(`/preventivi/${quoteId}`);
  redirect(`/preventivi/${quoteId}`);
}

export async function updateQuoteStatusAction(
  quoteId: string,
  status: string
): Promise<ActionResult> {
  const user = await requireUser();
  if (!(status in QuoteStatus)) return actionError("Stato non valido.");
  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: { status: status as keyof typeof QuoteStatus },
  });
  await logActivity(
    user.id,
    `ha segnato il preventivo ${quote.number} come ${QUOTE_STATUS[quote.status].label}`,
    "Client",
    quote.clientId
  );
  revalidatePath("/preventivi");
  revalidatePath(`/preventivi/${quoteId}`);
  return { ok: true };
}

export async function deleteQuoteAction(quoteId: string): Promise<ActionResult> {
  const user = await requireUser();
  const quote = await prisma.quote.delete({ where: { id: quoteId } });
  await logActivity(user.id, `ha eliminato il preventivo ${quote.number}`, "Client", quote.clientId);
  revalidatePath("/preventivi");
  redirect("/preventivi");
}
