"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/**
 * Bottone che chiede conferma e poi invoca una Server Action.
 * L'action può terminare con redirect (non torna) o con ActionResult.
 */
export function ConfirmActionButton({
  action,
  label,
  title,
  description,
  confirmLabel = "Conferma",
  successMessage,
  variant = "outline",
}: {
  action: () => Promise<ActionResult>;
  label: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  successMessage?: string;
  variant?: "outline" | "destructive" | "secondary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await action();
      setOpen(false);
      if (result?.ok === false) {
        toast.error(result.error ?? "Operazione non riuscita.");
      } else if (successMessage) {
        toast.success(successMessage);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} disabled={isPending}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Attendere…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
