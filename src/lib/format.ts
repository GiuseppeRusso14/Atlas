import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

/** "5 lug 2026" */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return format(date, "d MMM yyyy", { locale: it });
}

/** "5 luglio 2026, 14:30" */
export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return format(date, "d MMMM yyyy, HH:mm", { locale: it });
}

/** "3 giorni fa" */
export function formatRelative(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: it });
}

/** "1.234,56 €" — accetta anche i Decimal di Prisma (via toString). */
export function formatCurrency(
  value: number | string | { toString(): string } | null | undefined
): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "number" ? value : Number(value.toString());
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(num);
}

/** 90 → "1h 30m" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Valore per <input type="date"> (yyyy-MM-dd) o stringa vuota. */
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}
