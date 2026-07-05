/**
 * Etichette italiane per gli enum di dominio (gli enum restano in inglese
 * nel codice/DB) + varianti colore dei badge di stato.
 * Le varianti usano solo classi basate sui design token.
 */
import type {
  Area,
  ApprovalStatus,
  ClientStatus,
  PaymentStatus,
  PostStatus,
  Priority,
  ProjectStatus,
  QuoteStatus,
  Reparto,
  SocialPlatform,
  TaskStatus,
  WebSubtype,
  GraphicType,
} from "@/generated/prisma/client";

type LabelWithClass = { label: string; className: string };

export const CLIENT_STATUS: Record<ClientStatus, LabelWithClass> = {
  LEAD: { label: "Lead", className: "bg-accent-2/10 text-accent-2" },
  ACTIVE: { label: "Attivo", className: "bg-success/10 text-success" },
  PAUSED: { label: "In pausa", className: "bg-muted text-muted-foreground" },
  CLOSED: { label: "Chiuso", className: "bg-muted text-muted-foreground" },
};

export const PROJECT_STATUS: Record<ProjectStatus, LabelWithClass> = {
  DA_INIZIARE: { label: "Da iniziare", className: "bg-muted text-muted-foreground" },
  IN_CORSO: { label: "In corso", className: "bg-primary/10 text-primary" },
  IN_REVISIONE: { label: "In revisione", className: "bg-accent-2/10 text-accent-2" },
  COMPLETATO: { label: "Completato", className: "bg-success/10 text-success" },
  ARCHIVIATO: { label: "Archiviato", className: "bg-muted text-muted-foreground" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, LabelWithClass> = {
  DA_PAGARE: { label: "Da pagare", className: "bg-destructive/10 text-destructive" },
  ACCONTO: { label: "Acconto", className: "bg-primary/10 text-primary" },
  SALDATO: { label: "Saldato", className: "bg-success/10 text-success" },
};

export const TASK_STATUS: Record<TaskStatus, LabelWithClass> = {
  TODO: { label: "Da fare", className: "bg-muted text-muted-foreground" },
  IN_CORSO: { label: "In corso", className: "bg-primary/10 text-primary" },
  IN_REVISIONE: { label: "In revisione", className: "bg-accent-2/10 text-accent-2" },
  FATTO: { label: "Fatto", className: "bg-success/10 text-success" },
};

export const PRIORITY: Record<Priority, LabelWithClass> = {
  BASSA: { label: "Bassa", className: "bg-muted text-muted-foreground" },
  MEDIA: { label: "Media", className: "bg-accent-2/10 text-accent-2" },
  ALTA: { label: "Alta", className: "bg-primary/10 text-primary" },
  URGENTE: { label: "Urgente", className: "bg-destructive/10 text-destructive" },
};

export const QUOTE_STATUS: Record<QuoteStatus, LabelWithClass> = {
  BOZZA: { label: "Bozza", className: "bg-muted text-muted-foreground" },
  INVIATO: { label: "Inviato", className: "bg-accent-2/10 text-accent-2" },
  ACCETTATO: { label: "Accettato", className: "bg-success/10 text-success" },
  RIFIUTATO: { label: "Rifiutato", className: "bg-destructive/10 text-destructive" },
};

export const APPROVAL_STATUS: Record<ApprovalStatus, LabelWithClass> = {
  BOZZA: { label: "Bozza", className: "bg-muted text-muted-foreground" },
  IN_REVISIONE_INTERNA: { label: "Revisione interna", className: "bg-accent-2/10 text-accent-2" },
  DA_APPROVARE_CLIENTE: { label: "Da approvare cliente", className: "bg-primary/10 text-primary" },
  APPROVATO: { label: "Approvato", className: "bg-success/10 text-success" },
  REVISIONE_RICHIESTA: { label: "Revisione richiesta", className: "bg-destructive/10 text-destructive" },
};

export const POST_STATUS: Record<PostStatus, LabelWithClass> = {
  IDEA: { label: "Idea", className: "bg-muted text-muted-foreground" },
  BOZZA: { label: "Bozza", className: "bg-muted text-muted-foreground" },
  IN_REVISIONE: { label: "In revisione", className: "bg-accent-2/10 text-accent-2" },
  APPROVATO: { label: "Approvato", className: "bg-success/10 text-success" },
  PROGRAMMATO: { label: "Programmato", className: "bg-primary/10 text-primary" },
  PUBBLICATO: { label: "Pubblicato", className: "bg-success/10 text-success" },
};

export const AREA_LABEL: Record<Area, string> = {
  WEB: "Web",
  GRAFICA: "Grafica",
  SOCIAL: "Social",
};

export const REPARTO_LABEL: Record<Reparto, string> = {
  WEB: "Web",
  GRAFICA: "Grafica",
  SOCIAL: "Social",
};

export const WEB_SUBTYPE_LABEL: Record<WebSubtype, string> = {
  SITO_VETRINA: "Sito vetrina",
  LANDING: "Landing page",
  ECOMMERCE: "E-commerce",
  WEBAPP: "Web app",
};

export const GRAPHIC_TYPE_LABEL: Record<GraphicType, string> = {
  LOGO: "Logo",
  BRAND_IDENTITY: "Brand identity",
  GRAFICA_SOCIAL: "Grafica social",
  PRINT: "Print",
  ALTRO: "Altro",
};

export const SOCIAL_PLATFORM_LABEL: Record<SocialPlatform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  ALTRO: "Altro",
};
