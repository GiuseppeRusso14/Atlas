"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { actionError, type ActionResult } from "@/lib/action-result";
import {
  Area,
  ApprovalStatus,
  GraphicType,
  PaymentStatus,
  PostStatus,
  ProjectStatus,
  SocialPlatform,
  WebSubtype,
} from "@/generated/prisma/enums";
import { PROJECT_STATUS } from "@/lib/labels";

// ---------- Progetto ----------
const projectSchema = z.object({
  name: z.string().trim().min(1, "Il nome del progetto è obbligatorio"),
  clientId: z.string().min(1, "Seleziona un cliente"),
  area: z.enum(Area),
  status: z.enum(ProjectStatus),
  paymentStatus: z.enum(PaymentStatus),
  description: z.string().optional(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  budget: z.string().optional(),
});

function parseProjectForm(formData: FormData) {
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false as const,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const d = parsed.data;
  const budget = d.budget?.trim() ? Number(d.budget.replace(",", ".")) : null;
  if (budget !== null && (Number.isNaN(budget) || budget < 0)) {
    return {
      success: false as const,
      fieldErrors: { budget: ["Importo non valido"] },
    };
  }
  return {
    success: true as const,
    data: {
      name: d.name,
      clientId: d.clientId,
      area: d.area,
      status: d.status,
      paymentStatus: d.paymentStatus,
      description: d.description?.trim() || null,
      startDate: d.startDate ? new Date(d.startDate) : null,
      deadline: d.deadline ? new Date(d.deadline) : null,
      budget,
    },
    memberIds: formData.getAll("memberIds").map(String).filter(Boolean),
  };
}

export async function createProjectAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parseProjectForm(formData);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };

  const project = await prisma.project.create({
    data: {
      ...parsed.data,
      members: { connect: parsed.memberIds.map((id) => ({ id })) },
    },
  });
  await logActivity(user.id, "ha creato il progetto", "Project", project.id);
  revalidatePath("/progetti");
  redirect(`/progetti/${project.id}`);
}

export async function updateProjectAction(
  projectId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = parseProjectForm(formData);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };

  const before = await prisma.project.findUnique({ where: { id: projectId } });
  await prisma.project.update({
    where: { id: projectId },
    data: {
      ...parsed.data,
      members: { set: parsed.memberIds.map((id) => ({ id })) },
    },
  });
  if (before && before.status !== parsed.data.status) {
    await logActivity(
      user.id,
      `ha cambiato lo stato in "${PROJECT_STATUS[parsed.data.status].label}"`,
      "Project",
      projectId
    );
  } else {
    await logActivity(user.id, "ha aggiornato il progetto", "Project", projectId);
  }
  revalidatePath("/progetti");
  revalidatePath(`/progetti/${projectId}`);
  redirect(`/progetti/${projectId}`);
}

/** Archiviazione: consentita anche ai MEMBER (niente eliminazione per loro). */
export async function archiveProjectAction(projectId: string): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "ARCHIVIATO" },
  });
  await logActivity(user.id, "ha archiviato il progetto", "Project", projectId);
  revalidatePath("/progetti");
  revalidatePath(`/progetti/${projectId}`);
  return { ok: true };
}

/** Eliminazione definitiva: solo ADMIN. */
export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return actionError("Solo l'amministratore può eliminare i progetti.");
  }
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/progetti");
  redirect("/progetti");
}

// ---------- Dettaglio area WEB ----------
const webDetailSchema = z.object({
  subtype: z.enum(WebSubtype),
  stagingUrl: z.url("URL non valido").optional().or(z.literal("")),
  prodUrl: z.url("URL non valido").optional().or(z.literal("")),
  domainName: z.string().trim().optional(),
  domainExpiry: z.string().optional(),
  hostingProvider: z.string().trim().optional(),
  hostingExpiry: z.string().optional(),
  sslExpiry: z.string().optional(),
  techStack: z.string().trim().optional(),
});

export async function upsertWebDetailAction(
  projectId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = webDetailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const data = {
    subtype: d.subtype,
    stagingUrl: d.stagingUrl || null,
    prodUrl: d.prodUrl || null,
    domainName: d.domainName || null,
    domainExpiry: d.domainExpiry ? new Date(d.domainExpiry) : null,
    hostingProvider: d.hostingProvider || null,
    hostingExpiry: d.hostingExpiry ? new Date(d.hostingExpiry) : null,
    sslExpiry: d.sslExpiry ? new Date(d.sslExpiry) : null,
    techStack: d.techStack || null,
    maintenance: formData.get("maintenance") === "on",
  };
  await prisma.webDetail.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });
  await logActivity(user.id, "ha aggiornato i dettagli web", "Project", projectId);
  revalidatePath(`/progetti/${projectId}`);
  return { ok: true };
}

// ---------- Deliverable GRAFICA ----------
const deliverableSchema = z.object({
  type: z.enum(GraphicType),
  title: z.string().trim().min(1, "Il titolo è obbligatorio"),
  version: z.coerce.number().int().min(1).default(1),
  approvalStatus: z.enum(ApprovalStatus),
  referenceUrl: z.url("URL non valido").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function saveDeliverableAction(
  projectId: string,
  deliverableId: string | null,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = deliverableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const data = {
    type: d.type,
    title: d.title,
    version: d.version,
    approvalStatus: d.approvalStatus,
    referenceUrl: d.referenceUrl || null,
    notes: d.notes?.trim() || null,
  };
  if (deliverableId) {
    await prisma.graphicDeliverable.update({ where: { id: deliverableId }, data });
    await logActivity(user.id, `ha aggiornato il deliverable "${d.title}"`, "Project", projectId);
  } else {
    await prisma.graphicDeliverable.create({ data: { projectId, ...data } });
    await logActivity(user.id, `ha aggiunto il deliverable "${d.title}"`, "Project", projectId);
  }
  revalidatePath(`/progetti/${projectId}`);
  return { ok: true };
}

export async function updateDeliverableStatusAction(
  deliverableId: string,
  status: string
): Promise<ActionResult> {
  const user = await requireUser();
  if (!(status in ApprovalStatus)) return actionError("Stato non valido.");
  const deliverable = await prisma.graphicDeliverable.update({
    where: { id: deliverableId },
    data: { approvalStatus: status as keyof typeof ApprovalStatus },
  });
  await logActivity(
    user.id,
    `ha cambiato lo stato di "${deliverable.title}"`,
    "Project",
    deliverable.projectId
  );
  revalidatePath(`/progetti/${deliverable.projectId}`);
  return { ok: true };
}

export async function deleteDeliverableAction(
  deliverableId: string
): Promise<ActionResult> {
  await requireUser();
  const deliverable = await prisma.graphicDeliverable.delete({
    where: { id: deliverableId },
  });
  revalidatePath(`/progetti/${deliverable.projectId}`);
  return { ok: true };
}

// ---------- Post SOCIAL ----------
const postSchema = z.object({
  platform: z.enum(SocialPlatform),
  status: z.enum(PostStatus),
  scheduledDate: z.string().optional(),
  caption: z.string().optional(),
  hashtags: z.string().optional(),
  contentUrl: z.url("URL non valido").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function savePostAction(
  projectId: string,
  postId: string | null,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;
  const data = {
    platform: d.platform,
    status: d.status,
    scheduledDate: d.scheduledDate ? new Date(d.scheduledDate) : null,
    caption: d.caption?.trim() || null,
    hashtags: d.hashtags?.trim() || null,
    contentUrl: d.contentUrl || null,
    notes: d.notes?.trim() || null,
  };
  if (postId) {
    await prisma.socialPost.update({ where: { id: postId }, data });
    await logActivity(user.id, "ha aggiornato un post del piano editoriale", "Project", projectId);
  } else {
    await prisma.socialPost.create({ data: { projectId, ...data } });
    await logActivity(user.id, "ha aggiunto un post al piano editoriale", "Project", projectId);
  }
  revalidatePath(`/progetti/${projectId}`);
  return { ok: true };
}

export async function updatePostStatusAction(
  postId: string,
  status: string
): Promise<ActionResult> {
  const user = await requireUser();
  if (!(status in PostStatus)) return actionError("Stato non valido.");
  const post = await prisma.socialPost.update({
    where: { id: postId },
    data: { status: status as keyof typeof PostStatus },
  });
  await logActivity(user.id, "ha cambiato lo stato di un post", "Project", post.projectId);
  revalidatePath(`/progetti/${post.projectId}`);
  return { ok: true };
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  await requireUser();
  const post = await prisma.socialPost.delete({ where: { id: postId } });
  revalidatePath(`/progetti/${post.projectId}`);
  return { ok: true };
}
