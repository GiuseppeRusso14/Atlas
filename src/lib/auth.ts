import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

/**
 * Utente corrente dal DB, sincronizzato con Clerk.
 *
 * Strategia di sync (documentata nel README): il webhook Clerk
 * (`user.created`/`user.updated`) è la via principale; questo helper fa
 * anche un upsert on-demand al primo accesso, così l'app funziona pure
 * in locale senza tunnel per i webhook. L'aggancio a un utente già
 * presente nel DB (es. creato dal seed) avviene per email.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  // Primo accesso: recupera i dati da Clerk e aggancia/crea la riga User.
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email ||
    "Utente";

  const byEmail = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;

  if (byEmail) {
    // Riga pre-esistente (seed o creata a mano): collega il clerkId reale.
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { clerkId, name, avatarUrl: clerkUser.imageUrl },
    });
  }

  return prisma.user.create({
    data: {
      clerkId,
      email,
      name,
      avatarUrl: clerkUser.imageUrl,
      // role/reparto di default: MEMBER senza reparto; l'ADMIN li imposta.
    },
  });
}

/** Come getCurrentUser, ma lancia se non autenticato (per le Server Action). */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Non autenticato.");
  }
  return user;
}

/** Enforcement lato server delle azioni riservate all'ADMIN. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("Operazione riservata all'amministratore.");
  }
  return user;
}
