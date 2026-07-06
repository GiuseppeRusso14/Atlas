"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { saveSubscriptionAction } from "@/app/(dashboard)/utile/actions";
import type { ActionResult } from "@/lib/action-result";

/** Versione serializzabile dell'abbonamento (Decimal → string). */
export type SubscriptionFormValues = {
  id: string;
  name: string;
  cost: string;
  billing: "MENSILE" | "ANNUALE";
  active: boolean;
  notes: string | null;
};

/** Dialog di creazione/modifica di un servizio aziendale. */
export function SubscriptionDialog({
  subscription,
}: {
  subscription?: SubscriptionFormValues;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await saveSubscriptionAction(
        subscription?.id ?? null,
        prev,
        formData
      );
      if (result.ok) {
        setOpen(false);
        toast.success(subscription ? "Servizio aggiornato." : "Servizio aggiunto.");
      }
      return result;
    },
    { ok: false }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {subscription ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Modifica ${subscription.name}`}>
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus data-icon="inline-start" /> Nuovo servizio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {subscription ? "Modifica servizio" : "Nuovo servizio aziendale"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <FormField label="Nome *" name="name" errors={state.fieldErrors}>
            <Input
              id="name"
              name="name"
              placeholder="es. Adobe Creative Cloud"
              defaultValue={subscription?.name}
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Costo (€) *" name="cost" errors={state.fieldErrors}>
              <Input
                id="cost"
                name="cost"
                inputMode="decimal"
                placeholder="es. 69,99"
                defaultValue={subscription?.cost}
                required
              />
            </FormField>
            <FormField label="Ricorrenza" name="billing" errors={state.fieldErrors}>
              <Select name="billing" defaultValue={subscription?.billing ?? "MENSILE"}>
                <SelectTrigger id="billing" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENSILE">Mensile</SelectItem>
                  <SelectItem value="ANNUALE">Annuale</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Note" name="notes" errors={state.fieldErrors}>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="es. piano Team, rinnovo a marzo"
              defaultValue={subscription?.notes ?? ""}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="active"
              defaultChecked={subscription?.active ?? true}
              className="size-4 accent-primary"
            />
            Servizio attivo (conta nel costo mensile)
          </label>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvataggio…" : "Salva"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
