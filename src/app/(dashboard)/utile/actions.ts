"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { actionError, type ActionResult } from "@/lib/action-result";
import { BillingCycle, ProfitEntryType } from "@/generated/prisma/enums";

const NONE = "__none__";

/** Importo da input testuale ("120,50" o "120.50") → numero valido. */
function parseAmount(raw: string | undefined): number | null {
  const n = Number((raw ?? "").trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------- Movimenti (accantonamenti e spese) ----------
const entrySchema = z.object({
  type: z.enum(ProfitEntryType),
  amount: z.string().min(1, "Inserisci l'importo"),
  description: z.string().trim().min(1, "La descrizione è obbligatoria"),
  date: z.string().optional(),
  quoteId: z.string().optional(),
});

export async function addProfitEntryAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = entrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const amount = parseAmount(d.amount);
  if (amount === null) {
    return { ok: false, fieldErrors: { amount: ["Importo non valido"] } };
  }

  // il preventivo di provenienza ha senso solo per gli accantonamenti
  const quoteId =
    d.type === "ACCANTONAMENTO" && d.quoteId && d.quoteId !== NONE ? d.quoteId : null;

  await prisma.profitEntry.create({
    data: {
      type: d.type,
      amount: amount.toFixed(2),
      description: d.description,
      date: d.date ? new Date(d.date) : new Date(),
      userId: user.id,
      quoteId,
    },
  });
  if (quoteId) revalidatePath(`/preventivi/${quoteId}`);
  await logActivity(
    user.id,
    d.type === "ACCANTONAMENTO"
      ? `ha accantonato ${amount.toFixed(2)}€ nell'utile`
      : `ha registrato una spesa di ${amount.toFixed(2)}€ dall'utile`,
    "User",
    user.id
  );
  revalidatePath("/utile");
  return { ok: true };
}

/** Eliminazione movimento: chi l'ha creato o l'ADMIN (come per le ore). */
export async function deleteProfitEntryAction(entryId: string): Promise<ActionResult> {
  const user = await requireUser();
  const entry = await prisma.profitEntry.findUnique({ where: { id: entryId } });
  if (!entry) return { ok: true };
  if (user.role !== "ADMIN" && entry.userId !== user.id) {
    return actionError("Puoi eliminare solo i movimenti registrati da te.");
  }
  await prisma.profitEntry.delete({ where: { id: entryId } });
  revalidatePath("/utile");
  return { ok: true };
}

// ---------- Abbonamenti / servizi aziendali ----------
const subscriptionSchema = z.object({
  name: z.string().trim().min(1, "Il nome del servizio è obbligatorio"),
  cost: z.string().min(1, "Inserisci il costo"),
  billing: z.enum(BillingCycle),
  notes: z.string().optional(),
});

export async function saveSubscriptionAction(
  subscriptionId: string | null,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireUser();
  const parsed = subscriptionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const cost = parseAmount(d.cost);
  if (cost === null) {
    return { ok: false, fieldErrors: { cost: ["Costo non valido"] } };
  }
  const data = {
    name: d.name,
    cost: cost.toFixed(2),
    billing: d.billing,
    notes: d.notes?.trim() || null,
    active: formData.get("active") !== null ? formData.get("active") === "on" : true,
  };

  if (subscriptionId) {
    await prisma.subscription.update({ where: { id: subscriptionId }, data });
  } else {
    await prisma.subscription.create({ data });
  }
  revalidatePath("/utile");
  return { ok: true };
}

export async function deleteSubscriptionAction(
  subscriptionId: string
): Promise<ActionResult> {
  await requireUser();
  // I movimenti già registrati restano (subscriptionId → SetNull).
  await prisma.subscription.delete({ where: { id: subscriptionId } });
  revalidatePath("/utile");
  return { ok: true };
}

/** "Registra pagamento": crea la SPESA dall'abbonamento in un click. */
export async function paySubscriptionAction(
  subscriptionId: string
): Promise<ActionResult> {
  const user = await requireUser();
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!subscription) return actionError("Abbonamento non trovato.");

  const label = subscription.billing === "ANNUALE" ? "canone annuale" : "canone mensile";
  await prisma.profitEntry.create({
    data: {
      type: "SPESA",
      amount: subscription.cost,
      description: `${subscription.name} — ${label}`,
      userId: user.id,
      subscriptionId: subscription.id,
    },
  });
  await logActivity(
    user.id,
    `ha registrato il pagamento di ${subscription.name} dall'utile`,
    "User",
    user.id
  );
  revalidatePath("/utile");
  return { ok: true };
}
