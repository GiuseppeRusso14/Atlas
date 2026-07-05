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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import type { ActionResult } from "@/lib/action-result";

export function ResourceAddDialog({
  action,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"LINK" | "NOTA">("LINK");
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        setOpen(false);
        toast.success("Aggiunto.");
      }
      return result;
    },
    { ok: false }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus data-icon="inline-start" /> Aggiungi
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuova nota o link</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <FormField label="Tipo" name="type" errors={state.fieldErrors}>
            <Select
              name="type"
              value={type}
              onValueChange={(v) => setType(v as "LINK" | "NOTA")}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LINK">Link</SelectItem>
                <SelectItem value="NOTA">Nota</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Titolo *" name="title" errors={state.fieldErrors}>
            <Input id="title" name="title" required />
          </FormField>
          {type === "LINK" ? (
            <FormField label="URL *" name="url" errors={state.fieldErrors}>
              <Input id="url" name="url" placeholder="https://…" />
            </FormField>
          ) : (
            <FormField label="Contenuto *" name="content" errors={state.fieldErrors}>
              <Textarea id="content" name="content" rows={4} />
            </FormField>
          )}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvataggio…" : "Aggiungi"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
