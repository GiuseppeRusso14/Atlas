"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { CLIENT_STATUS } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";
import type { Client, ClientStatus } from "@/generated/prisma/client";

type ClientFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  client?: Client; // presente in modifica
};

export function ClientForm({ action, client }: ClientFormProps) {
  const [state, formAction, isPending] = useActionState(action, { ok: true });

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Ragione sociale *" name="name" errors={state.fieldErrors}>
              <Input id="name" name="name" defaultValue={client?.name} required />
            </FormField>
            <FormField label="Stato" name="status" errors={state.fieldErrors}>
              <Select name="status" defaultValue={client?.status ?? "LEAD"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CLIENT_STATUS) as ClientStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {CLIENT_STATUS[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="P.IVA" name="vatNumber" errors={state.fieldErrors}>
              <Input id="vatNumber" name="vatNumber" defaultValue={client?.vatNumber ?? ""} />
            </FormField>
            <FormField label="Codice fiscale" name="fiscalCode" errors={state.fieldErrors}>
              <Input id="fiscalCode" name="fiscalCode" defaultValue={client?.fiscalCode ?? ""} />
            </FormField>
            <FormField label="Email" name="email" errors={state.fieldErrors}>
              <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} />
            </FormField>
            <FormField label="Telefono" name="phone" errors={state.fieldErrors}>
              <Input id="phone" name="phone" defaultValue={client?.phone ?? ""} />
            </FormField>
            <FormField label="Sito web" name="website" errors={state.fieldErrors}>
              <Input id="website" name="website" placeholder="https://…" defaultValue={client?.website ?? ""} />
            </FormField>
            <FormField label="Indirizzo" name="address" errors={state.fieldErrors}>
              <Input id="address" name="address" defaultValue={client?.address ?? ""} />
            </FormField>
          </div>
          <FormField label="Tag (separati da virgola)" name="tags" errors={state.fieldErrors}>
            <Input id="tags" name="tags" placeholder="es. e-commerce, locale" defaultValue={client?.tags.join(", ") ?? ""} />
          </FormField>
          <FormField label="Note" name="notes" errors={state.fieldErrors}>
            <Textarea id="notes" name="notes" rows={4} defaultValue={client?.notes ?? ""} />
          </FormField>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvataggio…" : client ? "Salva modifiche" : "Crea cliente"}
            </Button>
            <Button variant="ghost" asChild>
              <Link href={client ? `/clienti/${client.id}` : "/clienti"}>Annulla</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
