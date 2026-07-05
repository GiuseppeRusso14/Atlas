"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { WEB_SUBTYPE_LABEL } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";
import type { WebDetail, WebSubtype } from "@/generated/prisma/client";

/** Dettagli WEB del progetto: URL, dominio/hosting/SSL con scadenze. */
export function WebDetailForm({
  action,
  detail,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  detail: WebDetail | null;
}) {
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) toast.success("Dettagli web salvati.");
      return result;
    },
    { ok: true }
  );

  const dateValue = (d: Date | null | undefined) =>
    d ? d.toISOString().slice(0, 10) : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dettagli sito</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Tipologia *" name="subtype" errors={state.fieldErrors}>
              <Select name="subtype" defaultValue={detail?.subtype ?? "SITO_VETRINA"}>
                <SelectTrigger id="subtype" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(WEB_SUBTYPE_LABEL) as WebSubtype[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {WEB_SUBTYPE_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Stack tecnico" name="techStack" errors={state.fieldErrors}>
              <Input
                id="techStack"
                name="techStack"
                placeholder="es. Next.js, WordPress…"
                defaultValue={detail?.techStack ?? ""}
              />
            </FormField>
            <FormField label="URL staging" name="stagingUrl" errors={state.fieldErrors}>
              <Input id="stagingUrl" name="stagingUrl" placeholder="https://…" defaultValue={detail?.stagingUrl ?? ""} />
            </FormField>
            <FormField label="URL produzione" name="prodUrl" errors={state.fieldErrors}>
              <Input id="prodUrl" name="prodUrl" placeholder="https://…" defaultValue={detail?.prodUrl ?? ""} />
            </FormField>
            <FormField label="Dominio" name="domainName" errors={state.fieldErrors}>
              <Input id="domainName" name="domainName" placeholder="esempio.it" defaultValue={detail?.domainName ?? ""} />
            </FormField>
            <FormField label="Scadenza dominio" name="domainExpiry" errors={state.fieldErrors}>
              <Input id="domainExpiry" name="domainExpiry" type="date" defaultValue={dateValue(detail?.domainExpiry)} />
            </FormField>
            <FormField label="Hosting" name="hostingProvider" errors={state.fieldErrors}>
              <Input id="hostingProvider" name="hostingProvider" placeholder="es. Netsons, Vercel…" defaultValue={detail?.hostingProvider ?? ""} />
            </FormField>
            <FormField label="Scadenza hosting" name="hostingExpiry" errors={state.fieldErrors}>
              <Input id="hostingExpiry" name="hostingExpiry" type="date" defaultValue={dateValue(detail?.hostingExpiry)} />
            </FormField>
            <FormField label="Scadenza SSL" name="sslExpiry" errors={state.fieldErrors}>
              <Input id="sslExpiry" name="sslExpiry" type="date" defaultValue={dateValue(detail?.sslExpiry)} />
            </FormField>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="maintenance"
                  defaultChecked={detail?.maintenance ?? false}
                  className="size-4 accent-primary"
                />
                <Label asChild>
                  <span>Contratto di manutenzione attivo</span>
                </Label>
              </label>
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvataggio…" : "Salva dettagli web"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
