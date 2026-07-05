# Atlas — Gestionale Web Agency

Gestionale interno per una web agency italiana: clienti, progetti nelle tre aree
(**WEB · GRAFICA · SOCIAL**), task con Kanban, preventivi, time tracking e
dashboard con alert scadenze. Strumento per un team di 3 persone (1 ADMIN + 2 MEMBER).

> Il nome del prodotto è configurato **solo** in [`src/config/brand.ts`](src/config/brand.ts):
> per rinominare il gestionale basta modificare quel file.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + **TypeScript strict**
- **Tailwind CSS 4** + **shadcn/ui** — design token centralizzati in `src/app/globals.css`
- **Prisma 7** (driver adapter `@prisma/adapter-pg`) su **PostgreSQL**
  - sviluppo: Docker · produzione: **Neon**
- **Clerk** per l'autenticazione (UI localizzata in italiano)
- **Zod** (validazione Server Actions) · **date-fns** (locale it) · **recharts** · **lucide-react**

## Setup sviluppo

Prerequisiti: **Node 20.9+** (consigliato 22 LTS), **Docker Desktop**, un account [Clerk](https://clerk.com).

```bash
# 1. dipendenze
npm install

# 2. Postgres locale
docker compose up -d

# 3. variabili d'ambiente
cp .env.example .env
#    → compila le chiavi Clerk (dashboard.clerk.com → API Keys)

# 4. schema DB + dati di esempio
npx prisma migrate dev
npx prisma db seed

# 5. avvio
npm run dev            # http://localhost:3000
```

### Configurazione Clerk

1. Crea un'applicazione su [dashboard.clerk.com](https://dashboard.clerk.com) (email + password è sufficiente).
2. Copia `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY` in `.env`.
3. **Webhook (consigliato)**: aggiungi un endpoint webhook che punta a
   `https://<tuo-host>/api/webhooks/clerk` con gli eventi `user.created` e
   `user.updated`; copia il *Signing Secret* in `CLERK_WEBHOOK_SIGNING_SECRET`.
   In locale usa un tunnel (es. `ngrok http 3000`).

**Sync utenti (come funziona).** L'identità vive su Clerk; nel DB c'è una tabella
`User` (con `role` e `reparto`) agganciata tramite `clerkId`. La sincronizzazione
avviene in due modi complementari, documentati in [`src/lib/auth.ts`](src/lib/auth.ts):

- **Webhook** `user.created`/`user.updated` → upsert nel DB;
- **Upsert on-demand al primo accesso** (fallback): così l'app funziona anche in
  locale senza tunnel. L'aggancio a una riga già esistente (es. creata dal seed)
  avviene **per email**.

**Ruoli e reparti.** I nuovi utenti nascono `MEMBER` senza reparto: imposta
`role`/`reparto` via `npx prisma studio` (o direttamente nel seed). Il seed crea
già 3 utenti (ADMIN, grafica, social) con **email segnaposto**: sostituiscile
nel blocco `TEAM` in cima a `prisma/seed.ts` con le email reali del team — al
primo login l'account Clerk viene collegato alla riga con la stessa email.

### Permessi

| Azione | ADMIN | MEMBER |
|---|---|---|
| CRUD clienti/progetti/task/preventivi/ore | ✅ | ✅ |
| Eliminare clienti o progetti | ✅ | ❌ (può solo archiviare) |
| Gestione team / impostazioni | ✅ | ❌ |

L'enforcement è **doppio**: UI (azioni nascoste) + Server Action
(`requireAdmin()` in `src/lib/auth.ts`).

## Comandi utili

```bash
docker compose up -d / down     # avvia/ferma il DB (down -v = reset dati)
npx prisma studio               # GUI dati
npx prisma migrate dev --name x # nuova migration
npx prisma db seed              # ricarica dati di esempio
npm run dev / build / lint      # Next.js
```

## Struttura

```
├─ docker-compose.yml            # Postgres locale
├─ prisma/schema.prisma          # modello dati (fonte di verità)
├─ prisma/seed.ts                # dati di esempio
├─ prisma.config.ts              # config Prisma 7 (datasource, seed)
├─ src/proxy.ts                  # Clerk middleware (Next 16: ex middleware.ts)
├─ src/config/brand.ts           # nome/tagline del prodotto — unico punto da cambiare
├─ src/app/globals.css           # design token (palette corallo, radius, ombre)
├─ src/app/(auth)/               # sign-in / sign-up
├─ src/app/(dashboard)/          # app autenticata: clienti, progetti, task, preventivi, ore
│  └─ */actions.ts               # Server Actions (Zod + controllo ruolo)
├─ src/app/api/webhooks/clerk/   # sync utenti Clerk → DB
├─ src/components/               # componenti riusabili (ui/ = shadcn)
└─ src/lib/                      # prisma, auth, labels (enum → italiano), format
```

## Deploy in produzione (Neon + Vercel)

1. **Neon**: crea un progetto e copia la connection string **pooled**.
2. **Vercel**: importa il repo e imposta le env:
   - `DATABASE_URL` → connection string Neon
   - chiavi Clerk della **production instance** + webhook secret di produzione
3. Applica le migration al DB di produzione:
   ```bash
   DATABASE_URL="postgresql://…neon…" npx prisma migrate deploy
   ```
4. Aggiorna l'endpoint webhook Clerk con l'URL di produzione.
5. Push → Vercel builda (`npm run build` esegue anche `prisma generate`).

> Passare da Docker a Neon richiede **solo** il cambio di `DATABASE_URL`:
> stesso Postgres, stesse migration.

## Sicurezza

- `.env` è gitignorato; committa solo `.env.example`.
- Nessuna credenziale in chiaro nel DB: per gli accessi (FTP/hosting/CMS) usa
  una risorsa `LINK` che punta al password manager.
- Ogni input è validato con Zod; ogni mutazione sensibile verifica il ruolo lato server.
