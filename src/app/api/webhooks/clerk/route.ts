import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Sync utenti Clerk → tabella User.
 * Eventi gestiti: user.created, user.updated (upsert), user.deleted (no-op:
 * l'eliminazione dal team la gestisce l'ADMIN nel gestionale).
 * `role` e `reparto` NON vengono mai sovrascritti: vivono solo nel DB.
 */
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req); // firma verificata con CLERK_WEBHOOK_SIGNING_SECRET
  } catch {
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const data = evt.data;
    const email = data.email_addresses?.[0]?.email_address ?? "";
    // Nome da Clerk solo se presente: mai sovrascrivere quello già nel DB.
    const clerkName = [data.first_name, data.last_name]
      .filter(Boolean)
      .join(" ");

    // Aggancia per clerkId; se assente, per email (riga creata dal seed).
    const existing =
      (await prisma.user.findUnique({ where: { clerkId: data.id } })) ??
      (email ? await prisma.user.findUnique({ where: { email } }) : null);

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          clerkId: data.id,
          name: clerkName || existing.name,
          email,
          avatarUrl: data.image_url,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          clerkId: data.id,
          name: clerkName || email || "Utente",
          email,
          avatarUrl: data.image_url,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
