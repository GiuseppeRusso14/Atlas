import { differenceInCalendarDays } from "date-fns";

/**
 * Follow-up preventivi: dopo quanti giorni un preventivo INVIATO senza
 * risposta è considerato "da sollecitare". Unico punto da cambiare.
 */
export const QUOTE_FOLLOW_UP_DAYS = 7;

/** Giorni di attesa di un preventivo inviato (da emissione, o da ultima modifica). */
export function quoteWaitingDays(quote: {
  issuedDate: Date | null;
  updatedAt: Date;
}): number {
  return differenceInCalendarDays(new Date(), quote.issuedDate ?? quote.updatedAt);
}
