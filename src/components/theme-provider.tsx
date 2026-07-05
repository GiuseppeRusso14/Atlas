"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Gestione tema chiaro/scuro: applica la classe `dark` su <html>. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
