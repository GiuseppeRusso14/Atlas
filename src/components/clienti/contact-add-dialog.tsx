"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/form-field";
import type { ActionResult } from "@/lib/action-result";

export function ContactAddDialog({
  action,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        setOpen(false);
        toast.success("Contatto aggiunto.");
      }
      return result;
    },
    { ok: false }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus data-icon="inline-start" /> Aggiungi contatto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo contatto</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <FormField label="Nome *" name="name" errors={state.fieldErrors}>
            <Input id="name" name="name" required />
          </FormField>
          <FormField label="Ruolo" name="position" errors={state.fieldErrors}>
            <Input id="position" name="position" placeholder="es. Titolare" />
          </FormField>
          <FormField label="Email" name="email" errors={state.fieldErrors}>
            <Input id="email" name="email" type="email" />
          </FormField>
          <FormField label="Telefono" name="phone" errors={state.fieldErrors}>
            <Input id="phone" name="phone" />
          </FormField>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimary"
              name="isPrimary"
              className="size-4 accent-primary"
            />
            <Label htmlFor="isPrimary">Contatto primario</Label>
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvataggio…" : "Aggiungi"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
