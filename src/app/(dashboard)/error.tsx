"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Error boundary delle pagine autenticate. */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </span>
          <div>
            <p className="font-semibold">Qualcosa è andato storto</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error.message || "Errore imprevisto. Riprova."}
            </p>
          </div>
          <Button onClick={reset}>Riprova</Button>
        </CardContent>
      </Card>
    </div>
  );
}
