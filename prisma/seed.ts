/**
 * Seed di sviluppo: 3 utenti (1 ADMIN + 2 MEMBER), clienti, progetti nelle
 * tre aree con i rispettivi dettagli, task, preventivi, ore e activity log.
 *
 * I `clerkId` sono placeholder: al primo login reale l'upsert (webhook o
 * on-demand) aggancia l'utente Clerk alla riga esistente tramite l'email.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * ⬇️ IL TEAM — metti qui nomi ed email VERE delle 3 persone.
 * L'email è la chiave di aggancio: al primo login con Clerk, l'account
 * viene collegato alla riga con la stessa email (e ne eredita role/reparto).
 */
const TEAM = {
  admin: {
    clerkId: "seed_admin",
    name: "Giuseppe Russo", // Web Developer
    email: "giuseppe.russo@esempio.it", // ← sostituisci con l'email di login reale
    role: "ADMIN",
    reparto: "WEB",
  },
  grafico: {
    clerkId: "seed_grafico",
    name: "Anna Alaimo", // Graphics Designer
    email: "anna.alaimo@esempio.it", // ← sostituisci con l'email di login reale
    role: "MEMBER",
    reparto: "GRAFICA",
  },
  social: {
    clerkId: "seed_social",
    name: "Sara Giannitto", // Social Media Manager
    email: "sara.giannitto@esempio.it", // ← sostituisci con l'email di login reale
    role: "MEMBER",
    reparto: "SOCIAL",
  },
} as const;

/** Giorni relativi a oggi, per avere scadenze sempre "vive" nel seed. */
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  // Ordine di cancellazione: prima le tabelle dipendenti, poi il backbone.
  await prisma.activityLog.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.quoteItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.socialPost.deleteMany();
  await prisma.graphicDeliverable.deleteMany();
  await prisma.webDetail.deleteMany();
  await prisma.task.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // ---------- Utenti (vedi TEAM in cima al file) ----------
  const admin = await prisma.user.create({ data: TEAM.admin });
  const grafico = await prisma.user.create({ data: TEAM.grafico });
  const social = await prisma.user.create({ data: TEAM.social });

  // ---------- Clienti ----------
  const trattoria = await prisma.client.create({
    data: {
      name: "Trattoria Da Peppino S.r.l.",
      vatNumber: "01234567890",
      email: "info@dapeppino.it",
      phone: "+39 081 555 1234",
      website: "https://dapeppino.it",
      address: "Via Roma 12, Napoli",
      status: "ACTIVE",
      tags: ["ristorazione", "locale"],
      notes: "Cliente storico, molto reattivo su WhatsApp.",
      contacts: {
        create: [
          { name: "Peppino Esposito", position: "Titolare", email: "peppino@dapeppino.it", phone: "+39 333 111 2222", isPrimary: true },
          { name: "Anna Esposito", position: "Amministrazione", email: "anna@dapeppino.it" },
        ],
      },
    },
  });

  const studioLegale = await prisma.client.create({
    data: {
      name: "Studio Legale Ferrara & Partners",
      vatNumber: "09876543210",
      fiscalCode: "FRRGNN70A01F839X",
      email: "segreteria@studioferrara.it",
      phone: "+39 02 555 9876",
      address: "Corso Magenta 45, Milano",
      status: "ACTIVE",
      tags: ["professionisti", "b2b"],
      contacts: {
        create: [{ name: "Avv. Giovanni Ferrara", position: "Founding Partner", email: "g.ferrara@studioferrara.it", isPrimary: true }],
      },
    },
  });

  const boutique = await prisma.client.create({
    data: {
      name: "Boutique Milù",
      vatNumber: "05556667778",
      email: "ciao@boutiquemilu.it",
      website: "https://boutiquemilu.it",
      address: "Via dei Mille 8, Salerno",
      status: "ACTIVE",
      tags: ["moda", "e-commerce", "social"],
      notes: "Vuole spingere molto su Instagram e TikTok.",
      contacts: {
        create: [{ name: "Milena Russo", position: "Titolare", email: "milena@boutiquemilu.it", phone: "+39 340 987 6543", isPrimary: true }],
      },
    },
  });

  const palestra = await prisma.client.create({
    data: {
      name: "FitLab Palestre S.s.d.",
      email: "info@fitlab.fit",
      phone: "+39 089 222 3344",
      status: "LEAD",
      tags: ["fitness", "lead-caldo"],
      notes: "Arrivato da passaparola. In attesa di risposta sul preventivo sito + social.",
    },
  });

  await prisma.client.create({
    data: {
      name: "Vecchio Cliente S.n.c.",
      email: "info@vecchiocliente.it",
      status: "CLOSED",
      tags: ["archivio"],
      notes: "Collaborazione conclusa nel 2025.",
    },
  });

  // ---------- Progetti: area WEB ----------
  const sitoTrattoria = await prisma.project.create({
    data: {
      clientId: trattoria.id,
      name: "Restyling sito vetrina",
      area: "WEB",
      status: "IN_CORSO",
      description: "Nuovo sito vetrina con menù digitale e prenotazioni via widget esterno.",
      startDate: daysFromNow(-20),
      deadline: daysFromNow(15),
      budget: "2400.00",
      paymentStatus: "ACCONTO",
      members: { connect: [{ id: admin.id }, { id: grafico.id }] },
      webDetail: {
        create: {
          subtype: "SITO_VETRINA",
          stagingUrl: "https://staging.dapeppino.it",
          prodUrl: "https://dapeppino.it",
          domainName: "dapeppino.it",
          domainExpiry: daysFromNow(45),
          hostingProvider: "Netsons",
          hostingExpiry: daysFromNow(45),
          sslExpiry: daysFromNow(5),
          techStack: "WordPress + Elementor",
          maintenance: true,
        },
      },
    },
  });

  const ecommerceBoutique = await prisma.project.create({
    data: {
      clientId: boutique.id,
      name: "E-commerce Milù",
      area: "WEB",
      status: "DA_INIZIARE",
      description: "Shop online con catalogo stagionale e pagamenti Stripe.",
      startDate: daysFromNow(7),
      deadline: daysFromNow(75),
      budget: "6800.00",
      paymentStatus: "DA_PAGARE",
      members: { connect: [{ id: admin.id }] },
      webDetail: {
        create: {
          subtype: "ECOMMERCE",
          domainName: "boutiquemilu.it",
          domainExpiry: daysFromNow(200),
          hostingProvider: "Vercel + Neon",
          techStack: "Next.js + Stripe",
        },
      },
    },
  });

  // ---------- Progetti: area GRAFICA ----------
  const brandStudio = await prisma.project.create({
    data: {
      clientId: studioLegale.id,
      name: "Brand identity Studio Ferrara",
      area: "GRAFICA",
      status: "IN_REVISIONE",
      description: "Logo, palette, biglietti da visita e carta intestata.",
      startDate: daysFromNow(-30),
      deadline: daysFromNow(10),
      budget: "1800.00",
      paymentStatus: "ACCONTO",
      members: { connect: [{ id: grafico.id }] },
      graphicItems: {
        create: [
          { type: "LOGO", title: "Logo principale", version: 3, approvalStatus: "DA_APPROVARE_CLIENTE", referenceUrl: "https://www.figma.com/file/esempio-logo-ferrara" },
          { type: "BRAND_IDENTITY", title: "Palette e tipografia", version: 2, approvalStatus: "IN_REVISIONE_INTERNA" },
          { type: "PRINT", title: "Biglietti da visita", version: 1, approvalStatus: "BOZZA", notes: "Attendere approvazione logo prima di impaginare." },
        ],
      },
    },
  });

  const graficheMilu = await prisma.project.create({
    data: {
      clientId: boutique.id,
      name: "Grafiche social collezione autunno",
      area: "GRAFICA",
      status: "IN_CORSO",
      description: "Template feed e stories per il lancio della collezione.",
      startDate: daysFromNow(-10),
      deadline: daysFromNow(20),
      budget: "900.00",
      paymentStatus: "DA_PAGARE",
      members: { connect: [{ id: grafico.id }, { id: social.id }] },
      graphicItems: {
        create: [
          { type: "GRAFICA_SOCIAL", title: "Template feed (9 post)", version: 1, approvalStatus: "APPROVATO", referenceUrl: "https://drive.google.com/drive/esempio-milu" },
          { type: "GRAFICA_SOCIAL", title: "Template stories", version: 2, approvalStatus: "REVISIONE_RICHIESTA", notes: "La cliente vuole più contrasto sui testi." },
        ],
      },
    },
  });

  // ---------- Progetti: area SOCIAL ----------
  const socialMilu = await prisma.project.create({
    data: {
      clientId: boutique.id,
      name: "Gestione social Milù",
      area: "SOCIAL",
      status: "IN_CORSO",
      description: "Piano editoriale mensile Instagram + TikTok, 12 post/mese.",
      startDate: daysFromNow(-60),
      deadline: daysFromNow(30),
      budget: "450.00",
      paymentStatus: "SALDATO",
      members: { connect: [{ id: social.id }] },
      socialPosts: {
        create: [
          { platform: "INSTAGRAM", status: "PUBBLICATO", scheduledDate: daysFromNow(-3), caption: "Nuovi arrivi in boutique ✨ Passa a trovarci!", hashtags: "#fashion #salerno #newcollection", contentUrl: "https://drive.google.com/esempio-post-1" },
          { platform: "INSTAGRAM", status: "PROGRAMMATO", scheduledDate: daysFromNow(2), caption: "Il capo della settimana: blazer oversize 🍂", hashtags: "#ootd #autunno" },
          { platform: "TIKTOK", status: "IN_REVISIONE", scheduledDate: daysFromNow(5), caption: "GRWM con i nuovi arrivi Milù", notes: "Manca la musica, sceglierla con Milena." },
          { platform: "INSTAGRAM", status: "IDEA", caption: "Reel dietro le quinte shooting collezione" },
        ],
      },
    },
  });

  await prisma.project.create({
    data: {
      clientId: trattoria.id,
      name: "Social Da Peppino",
      area: "SOCIAL",
      status: "COMPLETATO",
      description: "Campagna estiva Facebook/Instagram conclusa.",
      startDate: daysFromNow(-120),
      deadline: daysFromNow(-15),
      budget: "600.00",
      paymentStatus: "SALDATO",
      members: { connect: [{ id: social.id }] },
      socialPosts: {
        create: [
          { platform: "FACEBOOK", status: "PUBBLICATO", scheduledDate: daysFromNow(-40), caption: "Menù degustazione d'estate 🍝" },
          { platform: "INSTAGRAM", status: "PUBBLICATO", scheduledDate: daysFromNow(-30), caption: "La nostra terrazza vi aspetta 🌅" },
        ],
      },
    },
  });

  // ---------- Task ----------
  await prisma.task.createMany({
    data: [
      { projectId: sitoTrattoria.id, title: "Impaginare pagina menù", status: "IN_CORSO", priority: "ALTA", assigneeId: grafico.id, dueDate: daysFromNow(3) },
      { projectId: sitoTrattoria.id, title: "Configurare widget prenotazioni", status: "TODO", priority: "MEDIA", assigneeId: admin.id, dueDate: daysFromNow(8) },
      { projectId: sitoTrattoria.id, title: "Rinnovare certificato SSL", status: "TODO", priority: "URGENTE", assigneeId: admin.id, dueDate: daysFromNow(4) },
      { projectId: sitoTrattoria.id, title: "Raccolta foto piatti", status: "FATTO", priority: "MEDIA", assigneeId: grafico.id, dueDate: daysFromNow(-5) },
      { projectId: ecommerceBoutique.id, title: "Setup progetto Next.js + Stripe test", status: "TODO", priority: "MEDIA", assigneeId: admin.id, dueDate: daysFromNow(10) },
      { projectId: brandStudio.id, title: "Preparare presentazione logo v3", status: "IN_REVISIONE", priority: "ALTA", assigneeId: grafico.id, dueDate: daysFromNow(2) },
      { projectId: brandStudio.id, title: "Impaginare carta intestata", status: "TODO", priority: "BASSA", assigneeId: grafico.id },
      { projectId: graficheMilu.id, title: "Correggere contrasto template stories", status: "IN_CORSO", priority: "ALTA", assigneeId: grafico.id, dueDate: daysFromNow(1) },
      { projectId: socialMilu.id, title: "Scrivere caption post settimana prossima", status: "TODO", priority: "MEDIA", assigneeId: social.id, dueDate: daysFromNow(4) },
      { projectId: socialMilu.id, title: "Montare reel GRWM", status: "IN_REVISIONE", priority: "MEDIA", assigneeId: social.id, dueDate: daysFromNow(3) },
    ],
  });

  // ---------- Preventivi ----------
  await prisma.quote.create({
    data: {
      clientId: palestra.id,
      number: "2026-0007",
      status: "INVIATO",
      issuedDate: daysFromNow(-6),
      validUntil: daysFromNow(24),
      notes: "Pacchetto sito vetrina + gestione social 3 mesi.",
      items: {
        create: [
          { description: "Sito vetrina 5 pagine (design + sviluppo)", quantity: "1", unitPrice: "1900.00" },
          { description: "Gestione social (mese)", quantity: "3", unitPrice: "400.00" },
          { description: "Shooting fotografico in sede", quantity: "1", unitPrice: "350.00" },
        ],
      },
    },
  });

  await prisma.quote.create({
    data: {
      clientId: boutique.id,
      projectId: ecommerceBoutique.id,
      number: "2026-0006",
      status: "ACCETTATO",
      issuedDate: daysFromNow(-15),
      validUntil: daysFromNow(15),
      items: {
        create: [
          { description: "E-commerce completo (catalogo + checkout Stripe)", quantity: "1", unitPrice: "5800.00" },
          { description: "Formazione gestione ordini (ore)", quantity: "4", unitPrice: "60.00" },
          { description: "Setup spedizioni e email transazionali", quantity: "1", unitPrice: "760.00" },
        ],
      },
    },
  });

  await prisma.quote.create({
    data: {
      clientId: studioLegale.id,
      number: "2026-0005",
      status: "BOZZA",
      notes: "Possibile estensione: sito one-page dopo la brand identity.",
      items: { create: [{ description: "Sito one-page istituzionale", quantity: "1", unitPrice: "1200.00" }] },
    },
  });

  // ---------- Time tracking ----------
  await prisma.timeEntry.createMany({
    data: [
      { userId: admin.id, projectId: sitoTrattoria.id, minutes: 180, date: daysFromNow(-2), note: "Setup hosting e staging" },
      { userId: grafico.id, projectId: sitoTrattoria.id, minutes: 240, date: daysFromNow(-1), note: "Layout pagina menù" },
      { userId: grafico.id, projectId: brandStudio.id, minutes: 300, date: daysFromNow(-3), note: "Terza iterazione logo" },
      { userId: grafico.id, projectId: graficheMilu.id, minutes: 120, date: daysFromNow(-1), note: "Revisione template stories" },
      { userId: social.id, projectId: socialMilu.id, minutes: 90, date: daysFromNow(-2), note: "Programmazione post settimana" },
      { userId: social.id, projectId: socialMilu.id, minutes: 60, date: daysFromNow(-1), note: "Community management" },
      { userId: admin.id, projectId: ecommerceBoutique.id, minutes: 45, date: daysFromNow(-4), note: "Call di kickoff con Milena" },
    ],
  });

  // ---------- Note & Link ----------
  await prisma.resource.createMany({
    data: [
      { type: "LINK", title: "Credenziali (password manager)", url: "https://vault.bitwarden.com/#/vault?collection=dapeppino", clientId: trattoria.id },
      { type: "LINK", title: "Moodboard brand Ferrara", url: "https://www.figma.com/file/esempio-moodboard", projectId: brandStudio.id },
      { type: "NOTA", title: "Brief e-commerce", content: "Catalogo ~120 prodotti, 2 collezioni/anno. Spedizioni con corriere GLS, reso entro 14 giorni.", projectId: ecommerceBoutique.id },
      { type: "NOTA", title: "Tono di voce social", content: "Informale ma curato, emoji con moderazione, sempre CTA al negozio fisico.", clientId: boutique.id },
    ],
  });

  // ---------- Activity log ----------
  await prisma.activityLog.createMany({
    data: [
      { userId: admin.id, action: "ha creato il progetto", entityType: "Project", entityId: sitoTrattoria.id },
      { userId: grafico.id, action: "ha cambiato stato in IN_REVISIONE", entityType: "Project", entityId: brandStudio.id },
      { userId: social.id, action: "ha programmato un post", entityType: "Project", entityId: socialMilu.id },
      { userId: admin.id, action: "ha inviato il preventivo 2026-0007", entityType: "Client", entityId: palestra.id },
      { userId: grafico.id, action: "ha aggiornato il deliverable Template stories", entityType: "Project", entityId: graficheMilu.id },
    ],
  });

  console.log("Seed completato ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
