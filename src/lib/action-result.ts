/** Esito standard delle Server Action usate dai form. */
export type ActionResult = {
  ok: boolean;
  /** Messaggio di errore generale, già in italiano, mostrabile all'utente. */
  error?: string;
  /** Errori per campo (chiave = name dell'input). */
  fieldErrors?: Record<string, string[]>;
};

export const actionOk: ActionResult = { ok: true };

export function actionError(error: string): ActionResult {
  return { ok: false, error };
}
