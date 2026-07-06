# Prompt per Claude Code — Atlas (Gestionale Web Agency)

> Copia l'intero contenuto di questo file come primo messaggio in Claude Code (o salvalo come `CLAUDE.md` nella root del progetto per usarlo come contesto persistente).

> **STATO: v1 + v1.1 → v1.6 COMPLETATE (luglio 2026).** Le milestone 1–21 e 25–31 sono implementate e committate; le 22–24 (v2) sono pianificate. Questo file resta la specifica dei requisiti; per l'operatività quotidiana vedi `README.md` e `COMANDI.md`, per il deploy `Produzione-todo.md`. Note post-implementazione segnalate nel testo con **[v1]**.

**Nome del prodotto:** il gestionale si chiama **Atlas**. Il nome, però, **non va mai scritto a mano nel codice**: deve stare in un unico file di configurazione del brand e va richiamato da lì ovunque compaia (sidebar, `<title>`, header, footer, email). Così cambiare nome in futuro significa modificare una sola riga. Vedi §9.1.

---

## 1. Contesto e obiettivo

Sto costruendo un **gestionale interno** per una web agency italiana. L'agenzia offre un pacchetto completo di servizi che si dividono in **tre aree operative**:

- **WEB** — siti vetrina, landing page, e-commerce, web app.
- **GRAFICA** — brand identity, loghi, grafiche per social, grafiche print.
- **SOCIAL** — gestione social media, piano editoriale, contenuti.

Il gestionale serve a **gestire i clienti e i loro progetti** attraverso queste tre aree, tenendo traccia di avanzamento, task, scadenze, preventivi e ore lavorate. È uno **strumento interno** usato da **3 persone** (io + un grafico + un social media manager). **Non** è un prodotto rivolto ai clienti finali.

**Principi da rispettare per tutto il progetto:**

- Codice pulito, tipizzato, modulare e commentato dove serve.
- **TypeScript in modalità strict.**
- Le tre aree **non** sono tre app separate: condividono uno stesso backbone (clienti, progetti, task, preventivi, ore). L'area è un attributo del progetto, non un silo.
- **Nessun colore o font hardcoded** nei componenti: tutto deve passare da design token centralizzati (vedi §9), così restano modificabili in qualsiasi momento.
- **Interfaccia in lingua italiana** (etichette, bottoni, messaggi). Gli identificatori di codice, gli enum e i nomi di tabella restano in inglese.
- Procedi **per milestone incrementali** (vedi §12): non generare tutto in un colpo solo, costruisci e verifica un modulo alla volta.

---

## 2. Stack tecnico (obbligatorio)

- **Next.js 16** — App Router, React Server Components, Server Actions.
- **TypeScript** (strict).
- **Tailwind CSS** + **shadcn/ui** per i componenti. **[v1]** È stata usata Tailwind **4**: niente `tailwind.config.ts`, i token vivono in `globals.css` via `@theme`.
- **Prisma** come ORM. **[v1]** È stata usata Prisma **7**: config e seed in `prisma.config.ts` (non in package.json), driver adapter `@prisma/adapter-pg` obbligatorio, client generato in `src/generated/prisma` (gitignorato, rigenerato in build).
- **PostgreSQL** — in sviluppo via **Docker** (docker-compose), in produzione su **Neon** (Postgres serverless). Stesso motore in entrambi gli ambienti: le migration Prisma devono funzionare identiche.
- **Clerk** per l'autenticazione.
- **Zod** per la validazione di form e input delle Server Actions.
- **date-fns** per la gestione date, con locale italiano.
- Icone: **lucide-react**.

Non introdurre altre dipendenze pesanti senza motivarlo.

---

## 3. Fuori scope per la v1 (NON implementare)

Per mantenere la v1 snella, **non** implementare:

- Nessun **upload/storage di file** (loghi, allegati, immagini). Al loro posto si usano **link e note testuali** (vedi modello `Resource`).
- Nessuna **fatturazione completa** né fatturazione elettronica. Solo **preventivi** e **stato pagamento** sui progetti.
- Nessun **portale cliente** (i clienti non accedono al gestionale). Le "approvazioni" sono stati interni gestiti dal team.
- Nessun sistema di permessi granulare: solo due ruoli (vedi §4).
- Nessuna integrazione con API social esterne (metriche social inserite manualmente o rimandate a v2).

---

## 4. Ruoli e autenticazione

Autenticazione gestita con **Clerk**. Due ruoli soltanto:

- **ADMIN** — io. Accesso totale: gestione team, clienti, progetti, preventivi, impostazioni, cancellazioni.
- **MEMBER** — grafico e social media manager. Possono **creare e gestire** clienti, progetti, task, preventivi, note e time tracking. **Non** possono: gestire i membri del team, modificare impostazioni globali, eliminare clienti o progetti (possono solo archiviarli).

Oltre al ruolo, ogni utente ha un **reparto** (`WEB` | `GRAFICA` | `SOCIAL`), che serve per filtrare e assegnare il lavoro per competenza, **non** per limitare i permessi.

> **[v1] Stato accessi (luglio 2026):** i 3 account Clerk esistono tutti (email di test `+clerk_test`, OTP fisso `424242`): Giuseppe = ADMIN/Web, Anna = MEMBER/Grafica, Sara = MEMBER/Social (creata via Backend API, nessuna email inviata). Le **registrazioni pubbliche sono chiuse** (`sign_up_mode: restricted` sull'istanza dev): nuovi utenti solo da dashboard Clerk o via API. Da reimpostare anche sulla production instance al deploy — vedi `Produzione-todo.md`.

**Pattern di integrazione Clerk ↔ DB (importante):**

- L'identità (login, sessione) vive su Clerk.
- Nel database esiste comunque una tabella `User` che rispecchia gli utenti Clerk tramite il campo `clerkId`.
- I campi `role` e `reparto` sono memorizzati **nel DB**, non solo nei metadata di Clerk (così sono usabili nelle query e nelle relazioni, es. task assegnati a un utente).
- Sincronizza gli utenti con un **webhook Clerk** (`user.created`, `user.updated`) che fa upsert nella tabella `User`. In alternativa, un upsert on-demand al primo accesso. Documenta la scelta.
- Proteggi le route con il **middleware di Clerk**. Usa i componenti pronti `<SignIn />`, `<UserButton />`.
- Enforce dei permessi ADMIN sia lato UI (nascondere azioni) sia lato Server Action (controllo del ruolo prima di ogni mutazione sensibile). Non fidarti solo della UI.

---

## 5. Modello dati (Prisma)

Definisci il seguente schema Prisma. È la **fonte di verità** del dominio: implementalo fedelmente, aggiungendo indici dove sensato. Usa `cuid()` per gli id e timestamp `createdAt`/`updatedAt` ovunque.

```prisma
// ---------- Enums ----------
enum Role        { ADMIN MEMBER }
enum Reparto     { WEB GRAFICA SOCIAL }
enum Area        { WEB GRAFICA SOCIAL }

enum ClientStatus  { LEAD ACTIVE PAUSED CLOSED }
enum ProjectStatus { DA_INIZIARE IN_CORSO IN_REVISIONE COMPLETATO ARCHIVIATO }
enum PaymentStatus { DA_PAGARE ACCONTO SALDATO }

enum TaskStatus   { TODO IN_CORSO IN_REVISIONE FATTO }
enum Priority     { BASSA MEDIA ALTA URGENTE }

enum QuoteStatus  { BOZZA INVIATO ACCETTATO RIFIUTATO }

enum ResourceType { LINK NOTA }

// Sottotipi area WEB
enum WebSubtype   { SITO_VETRINA LANDING ECOMMERCE WEBAPP }
// Sottotipi area GRAFICA
enum GraphicType  { LOGO BRAND_IDENTITY GRAFICA_SOCIAL PRINT ALTRO }
enum ApprovalStatus { BOZZA IN_REVISIONE_INTERNA DA_APPROVARE_CLIENTE APPROVATO REVISIONE_RICHIESTA }
// Sottotipi area SOCIAL
enum SocialPlatform { INSTAGRAM FACEBOOK LINKEDIN TIKTOK YOUTUBE ALTRO }
enum PostStatus     { IDEA BOZZA IN_REVISIONE APPROVATO PROGRAMMATO PUBBLICATO }

// ---------- Backbone ----------
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  name      String
  email     String   @unique
  role      Role     @default(MEMBER)
  reparto   Reparto?
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects  Project[]    @relation("ProjectMembers")
  tasks     Task[]
  timeEntries TimeEntry[]
  activities  ActivityLog[]
}

model Client {
  id         String       @id @default(cuid())
  name       String       // ragione sociale
  vatNumber  String?      // P.IVA
  fiscalCode String?      // CF
  email      String?
  phone      String?
  website    String?
  address    String?
  status     ClientStatus @default(LEAD)
  tags       String[]
  notes      String?
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  contacts   Contact[]
  projects   Project[]
  quotes     Quote[]
  resources  Resource[]
}

model Contact {
  id        String  @id @default(cuid())
  clientId  String
  name      String
  position  String?
  email     String?
  phone     String?
  isPrimary Boolean @default(false)
  client    Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
}

model Project {
  id            String        @id @default(cuid())
  clientId      String
  name          String
  area          Area
  status        ProjectStatus @default(DA_INIZIARE)
  description   String?
  startDate     DateTime?
  deadline      DateTime?
  budget        Decimal?      @db.Decimal(10,2)
  paymentStatus PaymentStatus @default(DA_PAGARE)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  client        Client        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  members       User[]        @relation("ProjectMembers")
  tasks         Task[]
  resources     Resource[]
  timeEntries   TimeEntry[]

  // dettagli specifici per area (uno solo valorizzato in base a `area`)
  webDetail     WebDetail?
  graphicItems  GraphicDeliverable[]
  socialPosts   SocialPost[]
}

model Task {
  id          String     @id @default(cuid())
  projectId   String
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIA)
  assigneeId  String?
  dueDate     DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee    User?      @relation(fields: [assigneeId], references: [id])
}

model Quote {
  id         String      @id @default(cuid())
  clientId   String
  projectId  String?
  number     String      // progressivo preventivo
  status     QuoteStatus @default(BOZZA)
  issuedDate DateTime?
  validUntil DateTime?
  notes      String?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  client     Client      @relation(fields: [clientId], references: [id], onDelete: Cascade)
  items      QuoteItem[]
  // total calcolato dagli items (non persistere se derivabile, oppure ricalcola on-write)
}

model QuoteItem {
  id          String  @id @default(cuid())
  quoteId     String
  description String
  quantity    Decimal @db.Decimal(10,2) @default(1)
  unitPrice   Decimal @db.Decimal(10,2)
  quote       Quote   @relation(fields: [quoteId], references: [id], onDelete: Cascade)
}

model TimeEntry {
  id        String   @id @default(cuid())
  userId    String
  projectId String
  minutes   Int
  date      DateTime @default(now())
  note      String?
  user      User     @relation(fields: [userId], references: [id])
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

// Note e link generici, agganciabili a cliente o progetto (sostituiscono lo storage file)
model Resource {
  id        String       @id @default(cuid())
  type      ResourceType
  title     String
  url       String?      // valorizzato se type = LINK
  content   String?      // valorizzato se type = NOTA
  clientId  String?
  projectId String?
  createdAt DateTime     @default(now())
  client    Client?      @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project   Project?     @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model ActivityLog {
  id         String   @id @default(cuid())
  userId     String
  action     String   // es. "ha creato il progetto", "ha cambiato stato"
  entityType String   // "Client" | "Project" | "Task" | ...
  entityId   String
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])
}

// ---------- Dettagli area WEB ----------
model WebDetail {
  id             String      @id @default(cuid())
  projectId      String      @unique
  subtype        WebSubtype
  stagingUrl     String?
  prodUrl        String?
  domainName     String?
  domainExpiry   DateTime?
  hostingProvider String?
  hostingExpiry  DateTime?
  sslExpiry      DateTime?
  techStack      String?
  maintenance    Boolean     @default(false)
  project        Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

// ---------- Dettagli area GRAFICA ----------
model GraphicDeliverable {
  id             String         @id @default(cuid())
  projectId      String
  type           GraphicType
  title          String
  version        Int            @default(1)
  approvalStatus ApprovalStatus @default(BOZZA)
  referenceUrl   String?        // link a moodboard/reference/anteprima esterna
  notes          String?
  createdAt      DateTime       @default(now())
  project        Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

// ---------- Dettagli area SOCIAL ----------
model SocialPost {
  id            String         @id @default(cuid())
  projectId     String
  platform      SocialPlatform
  status        PostStatus     @default(IDEA)
  scheduledDate DateTime?
  caption       String?
  hashtags      String?
  contentUrl    String?        // link alla creatività (es. Drive/Figma)
  notes         String?
  createdAt     DateTime       @default(now())
  project       Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

// ---------- [v1.3] Produttività personale (pagina "Il mio lavoro") ----------
// To-do leggere e slegate dai progetti: NON entrano in Kanban/calendario/report.
model PersonalTodo {
  id        String    @id @default(cuid())
  userId    String
  title     String
  done      Boolean   @default(false)
  dueDate   DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PersonalNote {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ---------- [v1.5] Utile aziendale (salvadanaio per i servizi) ----------
enum ProfitEntryType { ACCANTONAMENTO SPESA }
enum BillingCycle    { MENSILE ANNUALE }
// [v1.6] ricorrenze di to-do/task: al completamento rinasce l'occorrenza successiva
enum Recurrence      { SETTIMANALE MENSILE }
// [v1.6] Task e PersonalTodo hanno inoltre `repeat Recurrence?`;
// Subscription ha `renewalDate DateTime?` (prossimo rinnovo) e
// `reviewDate DateTime?` ("valutare disdetta entro", anti abbonamenti-zombie).

// Libro mastro: saldo = somma accantonamenti - somma spese. Tutto manuale.
model ProfitEntry {
  id             String          @id @default(cuid())
  type           ProfitEntryType
  amount         Decimal         @db.Decimal(10,2)
  description    String
  date           DateTime        @default(now())
  userId         String          // chi ha registrato il movimento
  quoteId        String?         // accantonamento: preventivo di provenienza
  subscriptionId String?         // spesa: abbonamento pagato
  createdAt      DateTime        @default(now())
  user           User            @relation(fields: [userId], references: [id])
  quote          Quote?          @relation(fields: [quoteId], references: [id], onDelete: SetNull)
  subscription   Subscription?   @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
}

// Anagrafica servizi aziendali (Adobe, Figma, Claude…)
model Subscription {
  id        String       @id @default(cuid())
  name      String
  cost      Decimal      @db.Decimal(10,2)
  billing   BillingCycle @default(MENSILE)
  active    Boolean      @default(true)
  notes     String?
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  profitEntries ProfitEntry[]
}
```

> **Nota sicurezza:** NON prevedere campi per salvare password o credenziali di accesso (FTP, hosting, CMS) in chiaro. Se serve tracciare accessi, usare un `Resource` di tipo `LINK` che punta a un password manager esterno.

---

## 6. Moduli funzionali

### 6.1 Backbone condiviso (tutte le aree)

- **Clienti** — anagrafica completa (CRUD): ragione sociale, P.IVA/CF, contatti multipli (referenti con uno primario), stato (Lead/Attivo/In pausa/Chiuso), tag, note. Pagina di dettaglio cliente con tab: *Panoramica*, *Progetti*, *Preventivi*, *Note & Link*. Solo ADMIN può eliminare; MEMBER può archiviare (stato CLOSED).
- **Progetti (commesse)** — CRUD. Ogni progetto appartiene a un cliente e a **una** area. In base all'area, la pagina di dettaglio mostra la sezione specifica (§6.2/6.3/6.4). Campi: nome, area, stato, descrizione, date, deadline, budget opzionale, stato pagamento, membri assegnati. Vista lista con filtri per area, stato, cliente, reparto.
- **Task** — CRUD + vista **Kanban** per colonne di stato (Todo / In corso / In revisione / Fatto), con drag & drop. Assegnatario, priorità, scadenza. Filtrabili per progetto, assegnatario, reparto.
- **Preventivi** — CRUD con righe (QuoteItem). Stati: Bozza → Inviato → Accettato/Rifiutato. Totale calcolato dalle righe. Collegabile a cliente e opzionalmente a progetto.
- **Stato pagamento** — sul progetto: Da pagare / Acconto / Saldato. Filtrabile.
- **Time tracking** — inserimento ore per progetto (minuti, data, nota). Riepilogo ore per progetto e per utente.
- **Note & Link** — modello `Resource`, agganciabile a cliente o progetto. Sostituisce lo storage file.
- **Activity log** — registra le azioni principali (creazione/modifica/cambio stato) per cliente e progetto, mostrato nel dettaglio.
- **[v1.5] "Utile"** (`/utile`, visibile a tutto il team) — salvadanaio aziendale: **accantonamenti manuali** dai guadagni (importo libero, con preventivo di provenienza opzionale) e **spese** per i servizi aziendali. Anagrafica abbonamenti (nome, costo, mensile/annuale, attivo) con "Registra pagamento" in un click; KPI saldo disponibile, accantonato totale, costo servizi/mese (annuali /12) e autonomia in mesi. Eliminazione movimenti: solo autore o ADMIN. Sul dettaglio preventivo compare "Accantonato nell'utile" quando esistono movimenti collegati.
- **[v1.3] "Il mio lavoro"** (`/mio-lavoro`) — vista personale di chi è loggato: ore della settimana, task assegnati per scadenza, progetti attivi, **to-do personali** (aggiunta inline, spunta, scadenza opzionale, "pulisci completate") e **note personali** (blocco appunti). L'ADMIN ha un selettore per vedere la board di chiunque, **note incluse**, ma in sola lettura; le mutazioni lato server agiscono solo sulle righe dell'utente loggato (il `userId` non arriva mai dal client).

### 6.2 Area WEB

Sezione dedicata nel dettaglio progetto (`WebDetail`): sottotipo (vetrina/landing/e-commerce/web app), URL staging e produzione, dominio con **data di scadenza**, hosting con scadenza, scadenza SSL, stack tecnico, flag manutenzione. Le scadenze (dominio/hosting/SSL) devono comparire tra gli **alert scadenze** in dashboard.

### 6.3 Area GRAFICA

Lista di **deliverable** (`GraphicDeliverable`) per progetto: tipo (logo/brand identity/grafica social/print), **versione** e **stato di approvazione interno** (Bozza → Revisione interna → Da approvare cliente → Approvato / Revisione richiesta). Link opzionale a reference o anteprima esterna. L'approvazione è uno stato gestito dal team (nessun accesso cliente).

### 6.4 Area SOCIAL

**Piano editoriale**: lista/calendario di `SocialPost` per progetto, con piattaforma, data programmata, stato (Idea → Bozza → In revisione → Approvato → Programmato → Pubblicato), caption, hashtag, link alla creatività. Vista **calendario** dei post per data programmata. (Metriche/analytics: fuori scope v1.)

---

## 7. Dashboard (home)

Home con impostazione a card in stile dashboard SaaS. Mostra:

- **Card KPI** in alto: Progetti attivi, Task aperti, Preventivi in attesa, Scadenze nei prossimi 7 giorni.
- **Grafico andamento** (barre) — es. progetti/task completati per settimana. Usa `recharts`.
- **Radiale di avanzamento** — percentuale media di completamento dei progetti attivi.
- **Feed attività recenti** — stile lista con avatar, titolo, tag reparto, stato, come la sezione "Post Activity" dei mockup.
- **Alert scadenze** — deadline progetti + scadenze dominio/hosting/SSL imminenti.

I dati per reparto/utente devono essere filtrabili.

---

## 8. Struttura del progetto e convenzioni

- App Router: raggruppa le pagine autenticate sotto `app/(dashboard)/`. Route pubbliche di auth sotto `app/(auth)/`.
- **Server Components** di default; usa Client Components solo dove serve interattività.
- Mutazioni tramite **Server Actions** con validazione **Zod**; ogni action sensibile verifica il ruolo.
- `lib/prisma.ts` — singleton PrismaClient. `lib/auth.ts` — helper per utente corrente e ruolo.
- Componenti UI riutilizzabili in `components/`; i componenti shadcn in `components/ui/`.
- Naming: file kebab-case, componenti PascalCase, funzioni camelCase.
- Gestione errori e stati di loading espliciti (`loading.tsx`, `error.tsx`, skeleton).

---

## 9. UI / UX e design token

### 9.1 Nome del prodotto configurabile (brand)

Il nome del gestionale è **Atlas**, ma deve essere **facilmente sostituibile**. Crea un file `src/config/brand.ts` come unica fonte di verità del brand:

```ts
export const brand = {
  name: "Atlas",
  shortName: "Atlas",
  tagline: "Gestionale web agency",
} as const;
```

Regole:
- **Nessuna occorrenza hardcoded** della stringa "Atlas" nei componenti, nei metadata o altrove: leggi sempre `brand.name` / `brand.shortName` / `brand.tagline`.
- Usalo in: logo/nome nella sidebar corallo, `metadata.title` del root layout, header, footer, eventuali email.
- Il logo della sidebar può essere un monogramma testuale (la lettera iniziale di `brand.name`) o il nome per esteso, costruito con i design token esistenti — così cambia da solo se cambia il nome.


Direzione visiva: **dashboard SaaS moderna, morbida e "friendly"** — angoli molto arrotondati, ampio whitespace, layout a card con ombre leggere, KPI grandi in bold. **Sidebar laterale interamente color corallo** (icona + label; in fondo card utente con avatar e nome). Area contenuti su sfondo chiaro/crema.

**Tutti i valori seguenti vanno impostati come design token centralizzati** (variabili CSS in `globals.css` — con Tailwind 4 il mapping avviene lì via `@theme`, non esiste più `tailwind.config`), MAI hardcoded nei componenti, così sono modificabili in qualsiasi momento. Prevedi anche predisposizione per un eventuale tema scuro (blocco `.dark` già presente).

**Palette:**

| Token | Valore | Uso |
|---|---|---|
| `--primary` / corallo | `#F26E52` | Sidebar, bottoni primari (pill), KPI principale, barre evidenziate, radiali |
| `--navy` | `#101827` | Testo forte / eventuale tema scuro |
| `--accent-2` / indigo | `#5B4EE0` | Seconda serie nei grafici |
| `--background` | `#F7F4F1` | Sfondo app (crema tiepida) |
| `--card` | `#FFFFFF` | Superfici card |
| `--muted` | `#8A8F9A` | Testo secondario |
| `--success` | `#34C77B` | Badge/variazioni positive |
| `--danger` | `#F2545B` | Badge/variazioni negative |

**Forma e tipografia:**

- Raggio card: grande (`rounded-2xl`, ~20px). Bottoni: `rounded-full` (pill).
- Ombre morbide, bassa opacità.
- Font: **Plus Jakarta Sans** (fallback Manrope), caricato via `next/font`. Numeri KPI grandi e in bold.
- Sidebar corallo con testo/icone in bianco; item attivo evidenziato con superficie più chiara.

Usa i mockup di riferimento (dashboard analytics con card KPI, grafici a barre corallo, radiali, lista attività) come guida di layout, **non** come vincolo rigido.

---

## 10. Ambiente di sviluppo

- **`docker-compose.yml`** con un servizio **PostgreSQL** per lo sviluppo (porta, volume persistente, credenziali via env).
- **`.env.example`** con: `DATABASE_URL` (Postgres locale), chiavi Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`), variabili URL di sign-in/redirect.
- **Prisma**: `schema.prisma`, migration iniziale, `prisma migrate dev`.
- **Seed script** (`prisma/seed.ts`) con dati realistici di esempio: 3 utenti (1 ADMIN, 2 MEMBER con reparti diversi), alcuni clienti, progetti nelle 3 aree con i rispettivi dettagli, task, un paio di preventivi, qualche time entry. Serve per vedere subito la UI popolata.
- **README** con: setup Docker, comandi Prisma, avvio dev, configurazione Clerk, e note per il deploy su **Neon** (cambiare solo `DATABASE_URL`) + Vercel.

---

## 11. Ordine di sviluppo (milestone)

Procedi in quest'ordine, verificando che ogni milestone giri prima di passare alla successiva:

1. **Setup base** — Next.js 16 + TS strict + Tailwind + shadcn/ui + Prisma + docker-compose Postgres. App che parte, connessione DB ok.
2. **Modello dati** — schema Prisma completo (§5), migration, seed.
3. **Auth & layout** — Clerk (sign-in, middleware, webhook di sync su `User`), shell dell'app con **sidebar corallo** e design token (§9).
4. **Clienti** — CRUD completo + dettaglio con contatti, note/link, activity log. Enforcement permessi.
5. **Progetti** — CRUD + dettaglio con sezione area-specifica (WEB / GRAFICA / SOCIAL) + membri assegnati.
6. **Task** — CRUD + Kanban con drag & drop.
7. **Preventivi** — CRUD con righe e stati + stato pagamento sul progetto.
8. **Time tracking** — inserimento e riepiloghi ore.
9. **Dashboard** — KPI, grafici, feed attività, alert scadenze.
10. **Rifinitura** — stati loading/error, responsive, coerenza design token, pulizia.

**Milestone v1.1 (migliorie post-v1, luglio 2026) — ✅ TUTTE COMPLETATE:**

11. **Team (solo ADMIN)** — pagina `/team` con lista utenti e cambio ruolo/reparto dalla UI (senza Prisma Studio); protezione: un ADMIN non può declassare l'ultimo ADMIN.
12. **Tema scuro** — toggle chiaro/scuro con `next-themes` (in sidebar e mobile nav) sui token `.dark`; anche componenti Clerk e grafici si adattano.
13. **Paginazione** — liste clienti/progetti/preventivi paginate server-side (25/pagina, param `pagina`; i filtri resettano la pagina). Utility condivise in `src/lib/pagination.ts` (fuori dai moduli client: non invocabili dai Server Components).
14. **UX** — ricerca globale `/cerca` con **anteprima live** nella sidebar (dropdown via `/api/cerca`, debounce, risultati raggruppati e cliccabili); barra di ricerca anche sulla lista preventivi (numero o cliente); breadcrumb su tutte le pagine di dettaglio/modifica/creazione; `cursor: pointer` ripristinato globalmente sugli elementi cliccabili (Tailwind 4 non lo applica più ai button).
15. **Test E2E** — Playwright (`npm run test:e2e`): login con utente di test Clerk (strategia codice email, OTP fisso 424242 — il login con password farebbe scattare la verifica nuovo-dispositivo ad ogni run) → crea cliente → progetto → task → eliminazione di pulizia.

**Milestone v1.2 (risparmio tempo settimanale + qualità) — ✅ TUTTE COMPLETATE:**

16. **Export PDF preventivi** — pagina di stampa A4 (`/preventivi/[id]/stampa`, route group `(print)` senza sidebar) con carta intestata dal brand config, righe e totale; bottone "Scarica PDF" (stampa del browser → salva come PDF, zero dipendenze).
17. **Preventivo accettato → progetto** — sul preventivo ACCETTATO senza progetto collegato: bottone "Crea progetto" che precompila cliente, budget (dal totale) e descrizione (dalle righe), collega il preventivo e apre la modifica del progetto.
18. **Calendario globale** — vista `/calendario` mensile con tutto insieme: post social di tutti i progetti, deadline progetti, scadenze dominio/hosting/SSL, task in scadenza; filtri per tipo (badge toggle), voce in sidebar.
19. **Report mensile** — `/report` per mese: ore per cliente/progetto e preventivi accettati (attribuiti per data di emissione), KPI e export CSV (`/api/report/csv`); voce in sidebar.
20. **CI GitHub Actions** — `.github/workflows/ci.yml`: lint + typecheck + build ad ogni push/PR su main; job E2E già scritto ma commentato (si attiva coi secrets Clerk sul repo).
21. **Backup locale** — comandi `pg_dump`/ripristino documentati in COMANDI.md (produzione: point-in-time Neon).

Rifiniture post-v1.2: bottone "Dettagli" sulle righe della lista preventivi.

**Milestone v1.3 (produttività personale) — ✅ COMPLETATA:**

25. **"Il mio lavoro"** — pagina `/mio-lavoro` (voce in sidebar per tutti): KPI ore settimana e task aperti, i miei task per scadenza (ritardi in rosso), i miei progetti attivi, to-do list personale e note personali (modelli `PersonalTodo`/`PersonalNote`, slegati dai progetti). Selettore utente per l'ADMIN (vede tutto di tutti, note comprese, in sola lettura). ⚠️ Dopo `prisma migrate dev`/`generate` va riavviato il dev server: il singleton Prisma su `globalThis` trattiene il client vecchio.

**Milestone v1.4 (commerciale + automazioni + UX tastiera) — ✅ TUTTE COMPLETATE:**

26. **Follow-up preventivi** — colonna "In attesa da" sulla lista (rosso oltre soglia) e card "Preventivi da sollecitare" in dashboard; soglia in `src/lib/quotes.ts` (`QUOTE_FOLLOW_UP_DAYS`, default 7 giorni), attesa calcolata dalla data di emissione.
27. **Scadenze → task automatici** — quando dominio/hosting/SSL entra nella finestra dei 30 giorni (`src/lib/renewal-tasks.ts`), nasce da solo un task "Rinnovare…" con dueDate = scadenza, priorità ALTA, assegnato al primo ADMIN. Meccanismo "lazy cron" (gira all'apertura della dashboard, niente infrastruttura); idempotente per titolo (contiene la data di scadenza: dopo il rinnovo la data cambia → nuovo task all'anno successivo).
28. **Command palette ⌘K** — apribile ovunque con ⌘K/Ctrl+K (componente `command` shadcn/cmdk): azioni rapide (nuovo cliente/progetto/preventivo, registra ore), navigazione (voce Team solo ADMIN) e ricerca live via `/api/cerca`.

**Milestone v1.5 (utile aziendale) — ✅ COMPLETATA:**

29. **"Utile"** — pagina `/utile` con libro mastro (modelli `ProfitEntry`/`Subscription`): accantonamenti manuali dai guadagni e spese servizi, tutto registrato a mano (scelta esplicita: nessun automatismo su accettazione/saldo, nessun addebito ricorrente automatico). KPI saldo/accantonato/costo mensile/autonomia; visibile a tutto il team.

**Milestone v1.6 (promemoria servizi + to-do evolute) — ✅ TUTTE COMPLETATE:**

30. **Promemoria servizi** — su `/utile` card "Da registrare a <mese>": servizi attivi senza spesa registrata nel mese (mensili sempre attesi, annuali nel mese di rinnovo) con "Registra pagamento" inline. Campi `renewalDate`/`reviewDate` sugli abbonamenti: rinnovi e disdette-da-valutare compaiono nel **calendario globale** (tipo "Rinnovi servizi") e generano **to-do personali automatiche** per l'ADMIN a 14 giorni (lazy-cron `src/lib/subscription-reminders.ts`, idempotente per titolo; il promemoria di pagamento non nasce se la spesa del mese di rinnovo è già registrata). Badge "Da valutare" sui servizi con reviewDate scaduta.
31. **To-do evolute** — **ricorrenze** settimanali/mensili su to-do personali e task di progetto: al completamento (spunta, o task in FATTO da Kanban/dialog) rinasce l'occorrenza successiva con scadenza avanzata (icona ↻). **Promozione to-do → task**: bottone sulla to-do personale che la trasforma in task di progetto assegnato a sé (titolo, scadenza e ricorrenza conservati; la to-do viene rimossa).

**Milestone v2 (pianificate, da fare a prodotto in produzione):**

22. **Commenti sui task** con @menzioni.
23. **Notifiche** — campanella in-app per assegnazioni e scadenze (email di digest solo con consenso esplicito e provider dedicato).
24. **Duplicazione/template** — duplica preventivo; progetto da template con task predefiniti.

---

## 12. Criteri di accettazione v1

La v1 è completa quando:

- Login funzionante con Clerk; i 3 utenti hanno ruolo e reparto corretti nel DB.
- ADMIN vede/può tutto; MEMBER può creare e gestire clienti/progetti/task/preventivi/ore ma non gestire team, impostazioni, né eliminare (solo archiviare). L'enforcement è **sia UI sia server**.
- Si può creare un cliente, aggiungergli progetti nelle tre aree, e ogni area mostra la propria sezione specifica.
- Kanban dei task funziona con drag & drop.
- Preventivi con righe e totale; stato pagamento sul progetto.
- Time tracking con riepilogo per progetto e utente.
- Dashboard mostra KPI, grafici, attività recenti e alert scadenze (incluse scadenze dominio/hosting/SSL).
- UI in italiano, coerente con i design token (sidebar corallo), **zero colori/font hardcoded**.
- Nessun upload file, nessuna fatturazione completa, nessun portale cliente (rispetto dei fuori-scope §3).
- Seed funzionante, README chiaro, migration Prisma pulite, deploy su Neon documentato.

---

**Inizia dalla milestone 1. Prima di generare codice per una milestone, elenca brevemente cosa creerai; poi implementala. Fai domande solo se una scelta è realmente ambigua o bloccante.**
