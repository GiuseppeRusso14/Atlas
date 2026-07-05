"use client";

import { useActionState } from "react";
import Link from "next/link";
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
import {
  AREA_LABEL,
  PAYMENT_STATUS,
  PROJECT_STATUS,
  REPARTO_LABEL,
} from "@/lib/labels";
import { toDateInputValue } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";
import type {
  Area,
  PaymentStatus,
  ProjectStatus,
} from "@/generated/prisma/client";

type Option = { id: string; name: string };
type MemberOption = Option & { reparto: string | null };

/** Versione serializzabile del progetto (budget Decimal → string). */
export type ProjectFormValues = {
  id: string;
  name: string;
  clientId: string;
  area: Area;
  status: ProjectStatus;
  paymentStatus: PaymentStatus;
  description: string | null;
  startDate: Date | null;
  deadline: Date | null;
  budget: string | null;
  members: { id: string }[];
};

type ProjectFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  clients: Option[];
  users: MemberOption[];
  project?: ProjectFormValues;
  /** Cliente preselezionato (es. "nuovo progetto" dal dettaglio cliente). */
  defaultClientId?: string;
};

export function ProjectForm({
  action,
  clients,
  users,
  project,
  defaultClientId,
}: ProjectFormProps) {
  const [state, formAction, isPending] = useActionState(action, { ok: true });
  const memberIds = new Set(project?.members.map((m) => m.id));

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Nome progetto *" name="name" errors={state.fieldErrors}>
              <Input id="name" name="name" defaultValue={project?.name} required />
            </FormField>
            <FormField label="Cliente *" name="clientId" errors={state.fieldErrors}>
              <Select
                name="clientId"
                defaultValue={project?.clientId ?? defaultClientId}
              >
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
            <FormField label="Area *" name="area" errors={state.fieldErrors}>
              <Select name="area" defaultValue={project?.area ?? "WEB"}>
                <SelectTrigger id="area" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AREA_LABEL) as Area[]).map((a) => (
                    <SelectItem key={a} value={a}>
                      {AREA_LABEL[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Stato" name="status" errors={state.fieldErrors}>
              <Select name="status" defaultValue={project?.status ?? "DA_INIZIARE"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROJECT_STATUS) as ProjectStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_STATUS[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Data inizio" name="startDate" errors={state.fieldErrors}>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={toDateInputValue(project?.startDate)}
              />
            </FormField>
            <FormField label="Deadline" name="deadline" errors={state.fieldErrors}>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                defaultValue={toDateInputValue(project?.deadline)}
              />
            </FormField>
            <FormField label="Budget (€)" name="budget" errors={state.fieldErrors}>
              <Input
                id="budget"
                name="budget"
                inputMode="decimal"
                placeholder="es. 2400.00"
                defaultValue={project?.budget ?? ""}
              />
            </FormField>
            <FormField label="Stato pagamento" name="paymentStatus" errors={state.fieldErrors}>
              <Select
                name="paymentStatus"
                defaultValue={project?.paymentStatus ?? "DA_PAGARE"}
              >
                <SelectTrigger id="paymentStatus" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_STATUS) as PaymentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {PAYMENT_STATUS[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Descrizione" name="description" errors={state.fieldErrors}>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={project?.description ?? ""}
            />
          </FormField>

          <div className="space-y-2">
            <Label>Membri assegnati</Label>
            <div className="flex flex-wrap gap-4 rounded-xl border border-border p-4">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={u.id}
                    defaultChecked={memberIds.has(u.id)}
                    className="size-4 accent-primary"
                  />
                  {u.name}
                  {u.reparto ? (
                    <span className="text-xs text-muted-foreground">
                      ({REPARTO_LABEL[u.reparto as keyof typeof REPARTO_LABEL] ?? u.reparto})
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          </div>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvataggio…" : project ? "Salva modifiche" : "Crea progetto"}
            </Button>
            <Button variant="ghost" asChild>
              <Link href={project ? `/progetti/${project.id}` : "/progetti"}>
                Annulla
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
