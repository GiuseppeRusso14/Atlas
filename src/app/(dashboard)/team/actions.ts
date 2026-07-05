"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { actionError, type ActionResult } from "@/lib/action-result";
import { Reparto, Role } from "@/generated/prisma/enums";

const NONE = "__none__";

/** Cambio ruolo — solo ADMIN; l'ultimo ADMIN non può essere declassato. */
export async function updateUserRoleAction(
  userId: string,
  role: string
): Promise<ActionResult> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return actionError("Operazione riservata all'amministratore.");
  }
  if (!(role in Role)) return actionError("Ruolo non valido.");

  if (role === "MEMBER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (target?.role === "ADMIN" && adminCount <= 1) {
      return actionError("Deve restare almeno un ADMIN nel team.");
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: role as keyof typeof Role },
  });
  await logActivity(
    admin.id,
    `ha impostato ${user.name} come ${role === "ADMIN" ? "Admin" : "Membro"}`,
    "User",
    user.id
  );
  revalidatePath("/team");
  return { ok: true };
}

/** Cambio reparto — solo ADMIN. */
export async function updateUserRepartoAction(
  userId: string,
  reparto: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return actionError("Operazione riservata all'amministratore.");
  }
  if (reparto !== NONE && !(reparto in Reparto)) {
    return actionError("Reparto non valido.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { reparto: reparto === NONE ? null : (reparto as keyof typeof Reparto) },
  });
  revalidatePath("/team");
  return { ok: true };
}
