import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

/**
 * Flusso critico end-to-end: login → crea cliente → crea progetto → crea task.
 * Usa l'utente Clerk di test (email +clerk_test, nessuna email reale inviata).
 * A fine test il cliente creato viene eliminato (cascata su progetto e task).
 */
const EMAIL = process.env.E2E_CLERK_USER_EMAIL!;
const PASSWORD = process.env.E2E_CLERK_USER_PASSWORD!;

// Suffisso per rendere i nomi riconoscibili e non collidere con i dati seed.
const STAMP = `E2E ${Date.now()}`;
const CLIENT_NAME = `Cliente ${STAMP}`;
const PROJECT_NAME = `Progetto ${STAMP}`;
const TASK_TITLE = `Task ${STAMP}`;

test("login → cliente → progetto → task", async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "Impostare E2E_CLERK_USER_EMAIL/PASSWORD in .env");

  // ---- Login via codice email (strategia di test: codice fisso 424242) ----
  // Il login con password farebbe scattare la verifica "nuovo dispositivo"
  // ad ogni run; il codice email è la via ufficiale per gli utenti di test.
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Indirizzo email" }).fill(EMAIL);
  await page.getByRole("button", { name: "Continua", exact: true }).click();

  // Dalla schermata password passa a "usa un altro metodo" → codice email.
  await page.getByRole("link", { name: /altro metodo/i }).click();
  await page.getByRole("button", { name: /codice/i }).click();

  const otp = page.getByRole("textbox", { name: /verification code/i });
  await otp.click();
  await page.keyboard.type("424242", { delay: 120 });

  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 20_000,
  });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
    timeout: 20_000,
  });

  // ---- Crea cliente ----
  await page.goto("/clienti/nuovo");
  await page.getByLabel("Ragione sociale *").fill(CLIENT_NAME);
  await page.getByRole("button", { name: "Crea cliente" }).click();
  // Redirect al dettaglio del cliente appena creato
  await expect(page.getByRole("heading", { name: CLIENT_NAME })).toBeVisible();
  const clientUrl = page.url();

  // ---- Crea progetto collegato al cliente ----
  await page.goto("/progetti/nuovo");
  await page.getByLabel("Nome progetto *").fill(PROJECT_NAME);
  await page.locator("#clientId").click();
  await page.getByRole("option", { name: CLIENT_NAME }).click();
  await page.getByRole("button", { name: "Crea progetto" }).click();
  await expect(page.getByRole("heading", { name: PROJECT_NAME })).toBeVisible();

  // ---- Crea task sul progetto (dialog nel Kanban) ----
  await page.goto("/task");
  await page.getByRole("button", { name: "Nuovo task" }).click();
  await page.getByLabel("Titolo *").fill(TASK_TITLE);
  await page.locator("#projectId").click();
  await page.getByRole("option", { name: PROJECT_NAME }).click();
  await page.getByRole("button", { name: "Salva" }).click();
  // La card compare nella colonna "Da fare"
  await expect(page.getByText(TASK_TITLE)).toBeVisible();

  // ---- Pulizia: elimina il cliente (cascata su progetto e task) ----
  await page.goto(clientUrl);
  await page.getByRole("button", { name: "Elimina" }).click();
  await page.getByRole("button", { name: "Elimina definitivamente" }).click();
  // Redirect alla lista clienti: il cliente non c'è più
  await page.waitForURL(/\/clienti(\?|$)/, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: CLIENT_NAME })).toHaveCount(0);
});
