# Produzione — TODO

Checklist per portare Atlas in produzione: **GitHub → Neon → Vercel → Clerk production**.
Segui l'ordine: ogni fase serve alla successiva. Spunta man mano.

---

## Fase 0 — Decisioni preliminari (5 minuti, a tavolino)

- [ ] **Dominio**: il gestionale starà su un dominio tuo (es. `atlas.tuodominio.it`) o sul dominio `*.vercel.app`? Clerk production **richiede un dominio di produzione** (non vercel.app di default per i cookie di sessione: meglio un dominio proprio).
- [ ] **Email reali del team**: in produzione niente `+clerk_test` — servono le email vere con cui tu, Anna e Sara farete login. NON scriverle nei file: si useranno solo su dashboard Clerk e (se vuoi l'aggancio automatico) nel blocco `TEAM` di `prisma/seed.ts` senza committarle, oppure assegnando ruolo/reparto da `/team` dopo il primo login.
- [ ] **Dati iniziali**: in produzione si parte **vuoti** (consigliato) o con un seed minimo? ⚠️ NON eseguire il seed completo su Neon: cancella tutto e inserisce clienti finti.

## Fase 1 — Push su GitHub

Il remote esiste già (`github.com/GiuseppeRusso14/Atlas`) ed è vuoto. La cronologia è pulita (niente credenziali: verificato).

- [ ] Verifica che il repo GitHub sia **privato** (Settings → General → Danger Zone se serve cambiarlo)
- [ ] Push:
  ```bash
  git push -u origin main
  ```
- [ ] Controlla su GitHub che `.env` e `credenziali.txt` NON ci siano (sono gitignorati, ma verifica a occhio)

## Fase 2 — Database su Neon

- [ ] Crea il progetto su [neon.com](https://neon.com) (regione EU, es. Francoforte)
- [ ] Copia la **connection string POOLED** (quella con `-pooler` nell'host) — serve per Vercel/serverless
- [ ] Applica le migration al DB di produzione:
  ```bash
  DATABASE_URL="postgresql://…-pooler…neon.tech/…" npx prisma migrate deploy
  ```
- [ ] (Se deciso in Fase 0) eventuale seed minimo — MAI `prisma db seed` completo
- [ ] Nota: Neon ha point-in-time restore incluso; valuta la retention nel piano

## Fase 3 — Clerk production instance

- [ ] Dalla [dashboard Clerk](https://dashboard.clerk.com) → app "Gestionale-Web-Agency" → **Create production instance** (richiede il dominio della Fase 0)
- [ ] Configura i **DNS** richiesti da Clerk (CNAME per `clerk.tuodominio.it` ecc. — la dashboard li elenca)
- [ ] Copia le **chiavi di produzione** (`pk_live_…`, `sk_live_…`) — NON metterle in `.env` locale: vanno solo su Vercel
- [ ] ⚠️ **Reimposta `sign_up_mode: restricted`** anche sulla production instance (le istanze hanno config separate!):
  ```bash
  clerk config patch --json '{"auth_access_control":{"sign_up_mode":"restricted"}}' --instance prod --yes
  ```
- [ ] **Crea i 3 utenti reali** sulla production instance (dashboard → Users → Create user, con le email vere) — le registrazioni sono chiuse, quindi vanno creati da te
- [ ] Verifica utile: `clerk deploy status` controlla DNS e stato del deploy Clerk

## Fase 4 — Deploy su Vercel

- [ ] Importa il repo GitHub su [vercel.com](https://vercel.com) (framework: Next.js, rilevato da solo; il build esegue già `prisma generate`)
- [ ] Imposta le **variabili d'ambiente** (Production):
  | Variabile | Valore |
  |---|---|
  | `DATABASE_URL` | connection string **pooled** di Neon |
  | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |
  | `CLERK_SECRET_KEY` | `sk_live_…` |
  | `CLERK_WEBHOOK_SIGNING_SECRET` | (dopo la Fase 5) |
  | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
  | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
  | `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` |
  | `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/` |
  - ⚠️ NON impostare le variabili `E2E_*` in produzione
- [ ] Collega il **dominio** al progetto Vercel (lo stesso dichiarato a Clerk)
- [ ] Deploy → primo smoke test: la home reindirizza a `/sign-in`

## Fase 5 — Webhook Clerk di produzione

- [ ] Dashboard Clerk (production instance) → **Webhooks → Add endpoint**:
  - URL: `https://<tuo-dominio>/api/webhooks/clerk`
  - Eventi: `user.created`, `user.updated`
- [ ] Copia il **Signing Secret** (`whsec_…`) → variabile `CLERK_WEBHOOK_SIGNING_SECRET` su Vercel → redeploy
- [ ] Test: modifica un utente dalla dashboard Clerk e verifica che la riga nel DB si aggiorni

## Fase 6 — Verifica finale in produzione

- [ ] Login con il tuo account reale → assegna ruolo ADMIN alla tua riga (via Neon SQL editor o Prisma Studio puntato a Neon), poi gestisci Anna e Sara dalla pagina `/team`
- [ ] Permessi: da MEMBER **non** si vedono i bottoni Elimina (clienti/progetti) né la voce Team
- [ ] `/sign-up` con un'email estranea → deve rifiutare (restricted)
- [ ] Giro completo: crea cliente → progetto (3 aree) → task con drag&drop → preventivo → ore → dashboard con KPI e alert
- [ ] Tema scuro, ricerca globale con anteprima, paginazione
- [ ] HTTPS attivo e cookie di sessione sul dominio corretto

## Dopo il go-live (consigliati, non bloccanti)

- [ ] **Error tracking** (es. Sentry) per accorgersi degli errori prima che li segnali il team
- [ ] Backup: verifica retention point-in-time su Neon
- [ ] Chiavi di sviluppo e produzione SEMPRE separate (`.env` locale = solo dev)

---

*Riferimenti: `README.md` (sezione Deploy), `COMANDI.md`, `SETUP_E_GUIDA_OPERATIVA.md` §6.*
