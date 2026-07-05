"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import type { ActionResult } from "@/lib/action-result";
import { ResourceType } from "@/generated/prisma/enums";

/**
 * Note & Link (`Resource`): agganciabili a un cliente O a un progetto.
 * Sostituiscono lo storage file (fuori scope v1).
 */
const resourceSchema = z
  .object({
    type: z.enum(ResourceType),
    title: z.string().trim().min(1, "Il titolo è obbligatorio"),
    url: z.url("URL non valido (usa https://…)").optional().or(z.literal("")),
    content: z.string().optional(),
  })
  .refine((d) => (d.type === "LINK" ? !!d.url : true), {
    message: "Per un link l'URL è obbligatorio",
    path: ["url"],
  })
  .refine((d) => (d.type === "NOTA" ? !!d.content?.trim() : true), {
    message: "Per una nota il contenuto è obbligatorio",
    path: ["content"],
  });

type ResourceParent =
  | { clientId: string; projectId?: undefined }
  | { projectId: string; clientId?: undefined };

function parentPath(parent: ResourceParent): string {
  return parent.clientId
    ? `/clienti/${parent.clientId}`
    : `/progetti/${parent.projectId}`;
}

export async function addResourceAction(
  parent: ResourceParent,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = resourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const resource = await prisma.resource.create({
    data: {
      type: d.type,
      title: d.title,
      url: d.type === "LINK" ? d.url || null : null,
      content: d.type === "NOTA" ? d.content || null : null,
      clientId: parent.clientId ?? null,
      projectId: parent.projectId ?? null,
    },
  });
  await logActivity(
    user.id,
    d.type === "LINK" ? "ha aggiunto un link" : "ha aggiunto una nota",
    parent.clientId ? "Client" : "Project",
    parent.clientId ?? parent.projectId ?? resource.id
  );
  revalidatePath(parentPath(parent));
  return { ok: true };
}

export async function deleteResourceAction(
  resourceId: string
): Promise<ActionResult> {
  await requireUser();
  const resource = await prisma.resource.delete({ where: { id: resourceId } });
  if (resource.clientId) revalidatePath(`/clienti/${resource.clientId}`);
  if (resource.projectId) revalidatePath(`/progetti/${resource.projectId}`);
  return { ok: true };
}
