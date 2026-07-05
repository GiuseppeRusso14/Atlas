# Comandi utili — cheatsheet

Promemoria dei comandi da eseguire dalla root del progetto.

## Avvio quotidiano

```bash
docker compose up -d          # 1. avvia il database Postgres (serve Docker Desktop aperto)
npm run dev                   # 2. avvia l'app → http://localhost:3000
```

Per fermare tutto: `Ctrl+C` sul dev server, poi `docker compose down`.

## Database (Docker)

| Comando | Cosa fa |
|---|---|
| `docker compose up -d` | Avvia il Postgres locale in background |
| `docker compose down` | Ferma il database (i dati restano) |
| `docker compose down -v` | Ferma e **CANCELLA tutti i dati** (reset totale del volume) |
| `docker compose logs -f db` | Mostra i log del database |
| `docker compose ps` | Verifica se il container è attivo |

## Prisma

| Comando | Cosa fa |
|---|---|
| `npx prisma studio` | Apre la GUI per sfogliare/modificare i dati (utile per cambiare `role`/`reparto` degli utenti) |
| `npx prisma db seed` | Esegue il seed **esplicitamente**. ⚠️ Svuota le tabelle e ricrea i dati di esempio. Prisma 7 legge il comando da `prisma.config.ts` (`migrations.seed: "tsx prisma/seed.ts"`), non più da package.json |
| `npx prisma migrate dev --name <nome>` | Crea e applica una nuova migration dopo aver modificato `schema.prisma`. Esegue il seed **solo se** in quel run il DB viene resettato (es. drift rilevato); una migration normale non fa partire il seed |
| `npx prisma migrate reset` | Azzera il DB, riapplica tutte le migration e **esegue automaticamente il seed** |
| `npx prisma generate` | Rigenera il client TypeScript dopo modifiche allo schema (in `src/generated/prisma`) |
| `npx prisma migrate deploy` | Applica le migration in **produzione** (es. su Neon, con `DATABASE_URL` di produzione) |

## Next.js

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Dev server con hot reload (Turbopack) |
| `npm run build` | Build di produzione (esegue anche `prisma generate`) |
| `npm start` | Avvia la build di produzione in locale |
| `npm run lint` | Controlla il codice con ESLint |
| `npx tsc --noEmit` | Solo typecheck TypeScript, senza build |

## shadcn/ui

```bash
npx shadcn@latest add <componente>    # aggiunge un componente (es. calendar, switch…)
```

⚠️ Se chiede di sovrascrivere `button.tsx`, rispondi **No**: è personalizzato (bottoni pill).

## Clerk CLI

| Comando | Cosa fa |
|---|---|
| `clerk doctor` | Diagnostica: login, chiavi, app collegata |
| `clerk auth login` | Rifà il login al tuo account Clerk (browser) |
| `clerk env pull` | Riscarica le chiavi dell'app in `.env` |
| `clerk update --yes` | Aggiorna la CLI |

## Git

```bash
git log --oneline             # storia dei commit (uno per milestone)
git status                    # cosa è cambiato
```

## Reset completo (quando qualcosa non torna)

```bash
docker compose down -v && docker compose up -d   # database vergine
npx prisma migrate dev                            # riapplica migration (+ seed sul reset)
npm run dev
```

## Deploy (Neon + Vercel) — vedi README per i dettagli

```bash
DATABASE_URL="postgresql://…neon…" npx prisma migrate deploy   # migration sul DB di produzione
```

Su Vercel: imposta `DATABASE_URL` (Neon, connection string *pooled*) + chiavi Clerk **di produzione** + webhook secret. Il resto lo fa la build.
