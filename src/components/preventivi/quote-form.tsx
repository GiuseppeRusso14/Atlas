"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { QUOTE_STATUS } from "@/lib/labels";
import { formatCurrency, toDateInputValue } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";
import type { QuoteStatus } from "@/generated/prisma/client";

const NONE = "__none__";

type Option = { id: string; name: string };
type ProjectOption = Option & { clientId: string };

/** Riga editabile del preventivo (valori come stringhe per gli input). */
type ItemRow = { key: number; description: string; quantity: string; unitPrice: string };

/** Versione serializzabile del preventivo per il form. */
export type QuoteFormValues = {
  id: string;
  clientId: string;
  projectId: string | null;
  status: QuoteStatus;
  issuedDate: Date | null;
  validUntil: Date | null;
  notes: string | null;
  items: { description: string; quantity: string; unitPrice: string }[];
};

export function QuoteForm({
  action,
  clients,
  projects,
  quote,
  defaultClientId,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  clients: Option[];
  projects: ProjectOption[];
  quote?: QuoteFormValues;
  defaultClientId?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { ok: true });
  const [clientId, setClientId] = useState(quote?.clientId ?? defaultClientId ?? "");
  const [rows, setRows] = useState<ItemRow[]>(
    quote?.items.length
      ? quote.items.map((item, i) => ({ key: i, ...item }))
      : [{ key: 0, description: "", quantity: "1", unitPrice: "" }]
  );

  const clientProjects = projects.filter((p) => p.clientId === clientId);
  const total = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const q = Number(row.quantity.replace(",", "."));
        const p = Number(row.unitPrice.replace(",", "."));
        return sum + (Number.isNaN(q) || Number.isNaN(p) ? 0 : q * p);
      }, 0),
    [rows]
  );

  function updateRow(key: number, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Cliente *" name="clientId" errors={state.fieldErrors}>
              <Select name="clientId" value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="clientId" className="w-full">
                  <SelectValue placeholder="Seleziona cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Progetto collegato" name="projectId" errors={state.fieldErrors}>
              <Select name="projectId" defaultValue={quote?.projectId ?? NONE}>
                <SelectTrigger id="projectId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nessuno</SelectItem>
                  {clientProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Stato" name="status" errors={state.fieldErrors}>
              <Select name="status" defaultValue={quote?.status ?? "BOZZA"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUOTE_STATUS) as QuoteStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {QUOTE_STATUS[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Data emissione" name="issuedDate" errors={state.fieldErrors}>
                <Input
                  id="issuedDate"
                  name="issuedDate"
                  type="date"
                  defaultValue={toDateInputValue(quote?.issuedDate)}
                />
              </FormField>
              <FormField label="Valido fino al" name="validUntil" errors={state.fieldErrors}>
                <Input
                  id="validUntil"
                  name="validUntil"
                  type="date"
                  defaultValue={toDateInputValue(quote?.validUntil)}
                />
              </FormField>
            </div>
          </div>

          {/* Righe del preventivo */}
          <div className="space-y-2">
            <Label>Righe *</Label>
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.key} className="flex items-start gap-2">
                  <Input
                    name="itemDescription"
                    placeholder="Descrizione"
                    value={row.description}
                    onChange={(e) => updateRow(row.key, { description: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    name="itemQuantity"
                    placeholder="Qtà"
                    inputMode="decimal"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                    className="w-20"
                  />
                  <Input
                    name="itemUnitPrice"
                    placeholder="Prezzo €"
                    inputMode="decimal"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(row.key, { unitPrice: e.target.value })}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Rimuovi riga"
                    disabled={rows.length === 1}
                    onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                  >
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRows((prev) => [
                    ...prev,
                    {
                      key: Math.max(...prev.map((r) => r.key)) + 1,
                      description: "",
                      quantity: "1",
                      unitPrice: "",
                    },
                  ])
                }
              >
                <Plus data-icon="inline-start" /> Aggiungi riga
              </Button>
              <p className="text-sm">
                Totale: <span className="text-lg font-bold">{formatCurrency(total)}</span>
              </p>
            </div>
          </div>

          <FormField label="Note" name="notes" errors={state.fieldErrors}>
            <Textarea id="notes" name="notes" rows={3} defaultValue={quote?.notes ?? ""} />
          </FormField>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvataggio…" : quote ? "Salva modifiche" : "Crea preventivo"}
            </Button>
            <Button variant="ghost" asChild>
              <Link href={quote ? `/preventivi/${quote.id}` : "/preventivi"}>Annulla</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
