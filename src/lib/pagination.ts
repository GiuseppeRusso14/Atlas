/**
 * Utilità di paginazione condivise tra Server Components e client.
 * (Tenute fuori dal file "use client" della PaginationBar: le funzioni
 * esportate da un modulo client non sono invocabili lato server.)
 */

/** Dimensione pagina standard delle liste. */
export const PAGE_SIZE = 25;

/** Legge e normalizza il query param `pagina` (1-based). */
export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
