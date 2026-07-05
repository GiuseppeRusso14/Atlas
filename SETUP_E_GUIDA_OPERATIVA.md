# Setup & Guida operativa — Gestionale Web Agency

File di supporto al prompt principale (`PROMPT_GESTIONALE_WEBAGENCY.md`). Tienilo aperto mentre parti con la milestone 1. Contiene: prerequisiti, setup passo-passo, comandi utili, configurazione Clerk, trappole di Next.js 16, deploy su Neon, sicurezza e consigli per lavorare bene con Claude Code.

---

## 1. Prerequisiti

Prima di iniziare, assicurati di avere:

- [ ] **Node.js 20.9+** (consigliato **Node 22 LTS**). Next.js 16 **non** parte su Node 18. Verifica con `node --version`; se serve, installa via nvm: `nvm install 22 && nvm use 22`.
- [ ] **npm** (o pnpm, se preferisci — più veloce).
- [ ] **Docker Desktop** installato e avviato (per il Postgres locale).
- [ ] **Git**.
- [ ] Un **account Clerk** (clerk.com) — per l'autenticazione.
- [ ] Un **account Neon** (neon.com) — per il Postgres di produzione.
- [ ] Un **account Vercel** (opzionale, per il deploy).

> Nota: `create-next-app` più recente abilita già di default TypeScript, Tailwind, ESLint, App Router, Turbopack e l'alias di import `@/*`, e genera anche un `AGENTS.md`/`CLAUDE.md` per guidare gli agenti AI. Il patch esatto di Next cambia spesso: controlla con `npm show next version`.

---

## 2. Setup passo-passo (Milestone 1)

Esegui in quest'ordine. Puoi far svolgere questi step a Claude Code, ma è utile capirli per verificare che tutto vada a buon fine.

### 2.1 Crea il progetto
```bash
npx create-next-app@latest gestionale-agency
cd gestionale-agency
git init && git add -A && git commit -m "chore: init next.js 16 project"
```
Alla domanda su TypeScript / Tailwind / App Router / import alias, accetta i default (sì a tutto, alias `@/*`).

### 2.2 Postgres locale con Docker
Crea `docker-compose.yml` nella root:
```yaml
services:
  db:
    image: postgres:16
    container_name: gestionale-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: gestionale
      POSTGRES_PASSWORD: gestionale
      POSTGRES_DB: gestionale
    ports:
      - "5432:5432"
    volumes:
      - gestionale_pgdata:/var/lib/postgresql/data

volumes:
  gestionale_pgdata:
```
Avvialo:
```bash
docker compose up -d
```

### 2.3 Prisma
```bash
npm install prisma @prisma/client
npx prisma init
```
Poi imposta in `.env`:
```
DATABASE_URL="postgresql://gestionale:gestionale@localhost:5432/gestionale?schema=public"
```
Incolla lo schema dal prompt principale in `prisma/schema.prisma`, quindi:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 2.4 shadcn/ui
```bash
npx shadcn@latest init
```
Aggiungi i componenti man mano che servono, es.:
```bash
npx shadcn@latest add button card input table dialog dropdown-menu badge tabs
```

### 2.5 Clerk
```bash
npm install @clerk/nextjs
```
Configura le chiavi e il middleware seguendo §4. Poi avvia:
```bash
npm run dev
```
Apri `http://localhost:3000`.

### 2.6 Seed dei dati di esempio
Dopo aver creato `prisma/seed.ts` (come da prompt):
```bash
npx prisma db seed
```
(Configura lo script `prisma.seed` in `package.json` se non presente.)

---

## 3. Comandi utili (da tenere a portata)

**Docker**
```bash
docker compose up -d          # avvia il DB
docker compose down           # ferma il DB
docker compose down -v        # ferma e CANCELLA i dati (reset totale)
docker compose logs -f db     # log del DB
```

**Prisma**
```bash
npx prisma studio             # GUI per sfogliare/modificare i dati
npx prisma migrate dev --name <nome>   # nuova migration in dev
npx prisma migrate deploy     # applica migration in produzione
npx prisma generate           # rigenera il client dopo modifiche allo schema
npx prisma db seed            # esegue il seed
npx prisma migrate reset      # reset DB + riapplica migration + seed
```

**Next.js**
```bash
npm run dev                   # dev server (Turbopack)
npm run build                 # build di produzione
npm start                     # avvia la build
npx next upgrade              # aggiorna Next e le dipendenze React
```

**shadcn**
```bash
npx shadcn@latest add <componente>
```

---

## 4. Configurazione Clerk (dettaglio)

1. **Crea l'applicazione** nella dashboard Clerk. Scegli i metodi di login (email + password è sufficiente per un tool interno).
2. **Copia le chiavi** in `.env`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...
   CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   ```
3. **Middleware**: avvolgi l'app con `clerkMiddleware()`. ⚠️ **Attenzione (Next.js 16):** la convenzione è cambiata, il file `middleware.ts` ora si chiama `proxy.ts`. Metti `clerkMiddleware()` nel file corretto secondo la versione di Clerk che installi (verifica la sua guida per Next 16). Vedi §5.
4. **Provider**: avvolgi il root layout con `<ClerkProvider>`; usa `<UserButton />` nella sidebar e le pagine `<SignIn />` / `<SignUp />`.
5. **Webhook per sincronizzare `User`** (fondamentale per avere `role`/`reparto` nel DB):
   - Crea un endpoint `app/api/webhooks/clerk/route.ts`.
   - Nella dashboard Clerk, aggiungi un webhook che punta a quell'URL (in locale usa un tunnel come `ngrok`), con eventi `user.created` e `user.updated`.
   - Verifica la firma con `CLERK_WEBHOOK_SIGNING_SECRET`, poi fai upsert nella tabella `User` (mappando `clerkId`, email, nome).
6. **Assegnare ruolo e reparto**: dato che siete in 3, il modo più semplice è impostare `role`/`reparto` direttamente nel DB (via Prisma Studio) dopo il primo login di ciascuno, oppure nel seed. In alternativa, salvali nei `publicMetadata` di Clerk e leggili nel webhook.

---

## 5. Trappole di Next.js 16 da conoscere

Queste sono novità della versione 16: segnalale a Claude Code se non le applica.

- **Node 20.9+ obbligatorio.** Su Node 18 non parte.
- **`middleware.ts` → `proxy.ts`.** Il middleware è stato rinominato `proxy.ts` e gira sul runtime Node.js. Se una guida (inclusa quella di Clerk) parla ancora di `middleware.ts`, adatta al nuovo nome.
- **Params asincroni.** In App Router, `params` e `searchParams` delle pagine sono ora **Promise**: vanno attesi con `await`. Dimenticarlo dà errore in dev e `undefined` silenzioso in produzione.
- **`cookies()` e `headers()` sono async.** Vanno usati con `await`.
- **Turbopack è il bundler di default** per dev e build.
- **Caching esplicito.** Il caching non è più implicito: usa le nuove API (`revalidateTag` con profilo `cacheLife`, ecc.) quando serve.

---

## 6. Deploy in produzione (Neon + Vercel)

Quando la v1 è pronta:

1. **Neon**: crea un progetto, copia la **connection string** (usa quella *pooled* per ambienti serverless).
2. Nel provider di hosting (Vercel), imposta le **variabili d'ambiente**:
   - `DATABASE_URL` → connection string di Neon
   - le chiavi Clerk (usa le chiavi della **production instance** di Clerk, non quelle di sviluppo)
   - il webhook secret di produzione
3. **Applica le migration** al DB di produzione:
   ```bash
   npx prisma migrate deploy
   ```
4. **Aggiorna il webhook Clerk** con l'URL di produzione.
5. **Deploy** (push su Git → Vercel builda in automatico) e verifica: login, permessi, dati.

> Il bello dello stack: passare da Docker a Neon significa cambiare **solo** `DATABASE_URL`. Nessuna riscrittura, stesso Postgres.

---

## 7. Sicurezza (non saltare)

- [ ] **`.env` nel `.gitignore`.** Mai committare chiavi o connection string. Committa solo `.env.example` con i nomi delle variabili (senza valori).
- [ ] **Nessuna credenziale in chiaro nel DB.** Non salvare password FTP/hosting/CMS: usa un `Resource` di tipo `LINK` che punta a un password manager.
- [ ] **Enforce dei permessi lato server.** Ogni Server Action che modifica dati verifica il ruolo dell'utente: nascondere un bottone in UI non basta.
- [ ] **Valida ogni input** con Zod prima di scrivere sul DB.
- [ ] **Chiavi di produzione separate** da quelle di sviluppo (vale per Clerk e per il DB).

---

## 8. Lavorare bene con Claude Code

Qualche accorgimento per un flusso pulito:

- **Un modulo alla volta.** Chiedi a Claude Code di completare una milestone (§11 del prompt), verificala, poi passa alla successiva. Evita "fai tutto insieme": si perde il controllo e diventa difficile capire dove qualcosa si rompe.
- **Usa `CLAUDE.md` come contesto persistente.** Salva il prompt principale come `CLAUDE.md` nella root: Claude Code lo legge automaticamente e mantiene le regole (stack, design token, fuori-scope) durante tutta la sessione.
- **Commit ad ogni milestone funzionante.** Così hai sempre un punto di ripristino. Suggerimento: un branch per feature (`feat/clienti`, `feat/kanban`) e merge quando funziona.
- **Fai revisione prima di accettare.** Controlla soprattutto: enforcement dei permessi, colori/font presi dai token (non hardcoded), UI in italiano.
- **Se cambi un requisito, aggiornalo nel `CLAUDE.md`**, non solo a voce: mantieni un'unica fonte di verità.
- **Testa con il seed.** I dati di esempio ti fanno vedere subito se una vista funziona senza dover inserire tutto a mano.
- **Quando aggiungi funzioni future** (metriche social, tema scuro, export PDF dei preventivi), aggiungile come nuova milestone nel prompt, così restano tracciate.

---

## 9. Mappa dei file principali (dove sta cosa)

```
gestionale-agency/
├─ CLAUDE.md                      # il prompt principale (contesto persistente)
├─ docker-compose.yml             # Postgres locale
├─ .env / .env.example            # variabili (env NON committato)
├─ prisma/
│  ├─ schema.prisma               # modello dati (fonte di verità)
│  ├─ migrations/                 # storia delle migration
│  └─ seed.ts                     # dati di esempio
├─ proxy.ts                       # ex middleware.ts (Clerk)
├─ src/app/
│  ├─ (auth)/                     # sign-in / sign-up
│  ├─ (dashboard)/                # app autenticata (clienti, progetti, ...)
│  ├─ api/webhooks/clerk/         # sync utenti Clerk → DB
│  └─ globals.css                 # design token (variabili CSS)
├─ src/components/
│  └─ ui/                         # componenti shadcn
├─ src/config/
│  └─ brand.ts                    # nome/tagline del prodotto (Atlas) — unico punto da cambiare
├─ src/lib/
│  ├─ prisma.ts                   # singleton PrismaClient
│  └─ auth.ts                     # helper utente corrente / ruolo
└─ tailwind.config.ts             # token tipografia/colori
```

---

## 10. Checklist pre-produzione

- [ ] `npm run build` passa senza errori.
- [ ] Migration applicate su Neon (`prisma migrate deploy`).
- [ ] Variabili d'ambiente di produzione impostate (DB + Clerk production keys).
- [ ] Webhook Clerk di produzione configurato e testato (un nuovo utente compare nel DB con ruolo/reparto).
- [ ] Login funzionante; permessi ADMIN vs MEMBER verificati anche lato server.
- [ ] Design token coerenti, nessun colore/font hardcoded, UI in italiano.
- [ ] `.env` non committato; `.env.example` aggiornato.
- [ ] Backup/branching su Neon valutati (Neon offre branching del DB).

---

Buon lavoro. Parti dalla §1 (prerequisiti) e §2 (setup), poi passa la milestone 1 a Claude Code.
