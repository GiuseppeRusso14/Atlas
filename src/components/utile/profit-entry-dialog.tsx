"use client";

import { useActionState, useState } from "react";
import { PiggyBank, Receipt } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { addProfitEntryAction } from "@/app/(dashboard)/utile/actions";
import type { ActionResult } from "@/lib/action-result";

const NONE = "__none__";

type QuoteOption = { id: string; label: string };

/**
 * Dialog per registrare un movimento dell'utile: accantonamento (con
 * preventivo di provenienza opzionale) oppure spesa libera.
 */
export function ProfitEntryDialog({
  type,
  quotes = [],
}: {
  type: "ACCANTONAMENTO" | "SPESA";
  quotes?: QuoteOption[];
}) {
  const [open, setOpen] = useState(false);
  const isIn = type === "ACCANTONAMENTO";
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await addProfitEntryAction(prev, formData);
      if (result.ok) {
        setOpen(false);
        toast.success(isIn ? "Accantonamento registrato." : "Spesa registrata.");
      }
      return result;
    },
    { ok: false }
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isIn ? "default" : "outline"} size="sm">
          {isIn ? (
            <PiggyBank data-icon="inline-start" />
          ) : (
            <Receipt data-icon="inline-start" />
          )}
          {isIn ? "Accantonamento" : "Spesa"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isIn ? "Nuovo accantonamento" : "Nuova spesa"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="type" value={type} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Importo (€) *" name="amount" errors={state.fieldErrors}>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                placeholder="es. 150,00"
                required
              />
            </FormField>
            <FormField label="Data" name="date" errors={state.fieldErrors}>
              <Input id="date" name="date" type="date" defaultValue={today} />
            </FormField>
          </div>
          <FormField label="Descrizione *" name="description" errors={state.fieldErrors}>
            <Input
              id="description"
              name="description"
              placeholder={
                isIn ? "es. Quota dal saldo Boutique Milù" : "es. Licenza font annuale"
              }
              required
            />
          </FormField>
          {isIn && quotes.length > 0 ? (
            <FormField
              label="Preventivo di provenienza (opzionale)"
              name="quoteId"
              errors={state.fieldErrors}
            >
              <Select name="quoteId" defaultValue={NONE}>
                <SelectTrigger id="quoteId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nessuno</SelectItem>
                  {quotes.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvataggio…" : "Registra"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
