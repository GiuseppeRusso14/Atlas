# Produzione — TODO

Checklist per portare Atlas in produzione: **GitHub → Neon → Vercel → Clerk production**.
Segui l'ordine: ogni fase serve alla successiva. Spunta man mano.

> **Stato (luglio 2026):** Fase 1 ✅ fatta (repo pushato su GitHub; ricordati un
> `git push` ogni tanto: in locale ci sono sempre commit nuovi). Sull'istanza
> **dev** di Clerk le registrazioni sono già chiuse (`restricted`) e i 3 account
> di test funzionano. Restano: Fase 0 (decisioni), 2–6 e la gestione account
> reali (vedi la sezione dedicata in fondo).

---

## Fase 0 — Decisioni preliminari (5 minuti, a tavolino)

- [ ] **Dominio**: il gestionale starà su un dominio tuo (es. `atlas.tuodominio.it`)? Clerk production **richiede un dominio proprio** (i cookie di sessione non funzionano bene su `*.vercel.app`).
- [ ] **Email reali del team**: decidi con quali caselle voi 3 farete login (vedi sezione "Gestione account" in fondo). NON scriverle nei file del repo.
- [ ] **Dati iniziali**: in produzione si parte **vuoti** (consigliato). ⚠️ MAI eseguire il seed su Neon: cancella tutto e inserisce clienti finti.

## Fase 1 — Push su GitHub ✅ FATTA

- [x] Repo pushato su `github.com/GiuseppeRusso14/Atlas`
- [x] Cronologia pulita (niente credenziali, verificato prima del push)
- [x] Workflow CI rimosso (la build di Vercel farà da gate)
- [ ] Verifica una tantum che il repo sia **privato** e che `.env`/`credenziali.txt` non compaiano su GitHub
- [ ] D'ora in poi: `git push` periodico per allineare GitHub ai commit locali

## Fase 2 — Database su Neon

- [ ] Crea il progetto su [neon.com](https://neon.com) (regione EU, es. Francoforte)
- [ ] Copia la **connection string POOLED** (quella con `-pooler` nell'host) — serve per Vercel/serverless
- [ ] Applica le migration al DB di produzione:
  ```bash
  DATABASE_URL="postgresql://…-pooler…neon.tech/…" npx prisma migrate deploy
  ```
- [ ] Niente seed (vedi Fase 0): le tabelle restano vuote, i dati veri li inserite voi
- [ ] Nota: Neon include il point-in-time restore; controlla la retention del piano

## Fase 3 — Clerk production instance

- [ ] Dashboard Clerk → app "Gestionale-Web-Agency" → **Create production instance** (chiede il dominio della Fase 0)
- [ ] Configura i **DNS** richiesti (CNAME che la dashboard elenca — servono anche per le email che Clerk invierà, vedi sezione account)
- [ ] Copia le **chiavi di produzione** (`pk_live_…`, `sk_live_…`) — vanno SOLO nelle env di Vercel, mai in `.env` locale
- [ ] ⚠️ **Reimposta `sign_up_mode: restricted`** anche in production (le istanze hanno config separate!):
  ```bash
  clerk config patch --json '{"auth_access_control":{"sign_up_mode":"restricted"}}' --instance prod --yes
  ```
- [ ] Crea gli account reali del team (vedi sezione "Gestione account" in fondo)
- [ ] Verifica con `clerk deploy status` (DNS e stato del deploy Clerk)

## Fase 4 — Deploy su Vercel

- [ ] Importa il repo GitHub su [vercel.com](https://vercel.com) (Next.js rilevato da solo; la build esegue già `prisma generate`)
- [ ] Variabili d'ambiente (Production):
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
- [ ] Primo smoke test: la home reindirizza a `/sign-in`

## Fase 5 — Webhook Clerk di produzione

- [ ] Dashboard Clerk (production) → **Webhooks → Add endpoint**: `https://<dominio>/api/webhooks/clerk`, eventi `user.created` + `user.updated`
- [ ] Copia il **Signing Secret** (`whsec_…`) → env su Vercel → redeploy
- [ ] Test: modifica un utente dalla dashboard e verifica che la riga nel DB Neon si aggiorni

## Fase 6 — Verifica finale in produzione

- [ ] Primo login col tuo account reale → **bootstrap ADMIN** (vedi sotto) → gestisci Anna e Sara da `/team`
- [ ] Permessi: da MEMBER niente bottoni Elimina né voci Team
- [ ] `/sign-up` con un'email estranea → deve rifiutare (restricted)
- [ ] Giro completo: cliente → progetto (3 aree) → task (+ cestino) → preventivo (+ PDF) → ore → utile → dashboard/calendario/report
- [ ] HTTPS attivo e login persistente sul dominio

---

## 📧 Gestione account & email in produzione

Il punto chiave: **l'istanza di produzione è un mondo separato**. Gli account di
test (`+clerk_test`, codice fisso 424242) esistono solo nell'istanza dev e lì
restano — per lo sviluppo locale continuerete a usare quelli. In produzione si
riparte da zero con le email vere.

### Creare i 3 account reali (Fase 3)

Dalla dashboard Clerk (production) → **Users → Create user**, uno per persona,
con l'email vera. Due modi per la prima password:

1. **Consigliato — la scelgono loro**: crei l'utente con la sola email; ognuno
   apre il gestionale → "Password dimenticata?" → riceve il codice sulla sua
   casella e imposta la password da sé. Nessuna password che gira su WhatsApp.
2. In alternativa imposti tu una password temporanea a voce, che cambieranno
   dal proprio profilo (avatar → Manage account).

Con le registrazioni `restricted`, nessun altro potrà mai crearsi un account.

### Le email che Clerk invierà (automatiche, zero configurazione)

Sulle caselle vere arriveranno da Clerk: **codici di verifica** al primo login,
verifica **nuovo dispositivo** (il codice non è più 424242: arriva quello vero
via email), recupero password. Il mittente usa i DNS configurati in Fase 3 —
niente SMTP da gestire. I template si possono personalizzare (logo, testi) da
dashboard → Customization, ma i default vanno benissimo.

### Ruoli: il bootstrap del primo ADMIN

In produzione non c'è seed, quindi al primo login la tua riga `User` nasce
**MEMBER senza reparto** (creata dal webhook/sync). La pagina `/team` richiede
un ADMIN, quindi la prima promozione va fatta a mano, una sola volta, dal SQL
editor di Neon:

```sql
UPDATE "User" SET role = 'ADMIN', reparto = 'WEB' WHERE email = '<la-tua-email>';
```

Da lì in poi tutto dalla UI: Anna e Sara fanno il primo login, tu apri `/team`
e assegni reparto (Grafica / Social) — il ruolo MEMBER è già giusto di default.

### Regole di igiene

- **Mai email reali nei file del repo** (seed compreso): il blocco `TEAM` del
  seed serve solo allo sviluppo locale coi `+clerk_test`.
- Chiavi `pk_live_`/`sk_live_` solo nelle env di Vercel; il `.env` locale resta
  con le chiavi dev.
- Se una persona lascia il team: dashboard Clerk → delete user (il webhook non
  cancella la riga nel DB: riassegna i suoi task da `/team` e Prisma Studio).

---

## Dopo il go-live (consigliati, non bloccanti)

- [ ] **Error tracking** (es. Sentry) per accorgersi degli errori prima che li segnali il team
- [ ] Backup: verifica retention point-in-time su Neon
- [ ] Chiavi di sviluppo e produzione SEMPRE separate (`.env` locale = solo dev)

---

*Riferimenti: `README.md` (sezione Deploy), `COMANDI.md`, `SETUP_E_GUIDA_OPERATIVA.md` §6.*
