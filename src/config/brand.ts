/**
 * Unica fonte di verità del brand: il nome del prodotto NON va mai
 * scritto a mano altrove (componenti, metadata, email). Cambiare nome
 * al gestionale = modificare solo questo file.
 */
export const brand = {
  name: "Atlas",
  shortName: "Atlas",
  tagline: "Gestionale web agency",
} as const;

/** Monogramma per il logo in sidebar (iniziale del nome). */
export const brandMonogram = brand.shortName.charAt(0).toUpperCase();
