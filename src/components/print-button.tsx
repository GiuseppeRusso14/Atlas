"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Avvia la stampa del browser: da lì si salva come PDF. */
export function PrintButton() {
  return (
    <Button onClick={() => window.print()}>
      <Printer data-icon="inline-start" /> Stampa / Salva PDF
    </Button>
  );
}
