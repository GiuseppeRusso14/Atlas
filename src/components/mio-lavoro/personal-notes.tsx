"use client";

import { useActionState, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import { DeleteIconButton } from "@/components/delete-icon-button";
import { deleteNoteAction, saveNoteAction } from "@/app/(dashboard)/mio-lavoro/actions";
import { formatDate } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";
import type { PersonalNote } from "@/generated/prisma/client";

/** Sezione note personali (blocco appunti dell'utente). */
export function PersonalNotes({
  notes,
  readOnly = false,
}: {
  notes: PersonalNote[];
  readOnly?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Note personali</CardTitle>
        {!readOnly ? <NoteDialog /> : null}
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nessuna nota. {readOnly ? "" : "Appunta idee, promemoria, bozze."}
          </p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{note.title}</p>
                  {!readOnly ? (
                    <div className="flex shrink-0">
                      <NoteDialog note={note} />
                      <DeleteIconButton
                        action={deleteNoteAction.bind(null, note.id)}
                        ariaLabel={`Elimina ${note.title}`}
                      />
                    </div>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {note.content}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(note.updatedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function NoteDialog({ note }: { note?: PersonalNote }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await saveNoteAction(note?.id ?? null, prev, formData);
      if (result.ok) {
        setOpen(false);
        toast.success(note ? "Nota aggiornata." : "Nota salvata.");
      }
      return result;
    },
    { ok: false }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {note ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Modifica ${note.title}`}>
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus data-icon="inline-start" /> Nuova nota
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{note ? "Modifica nota" : "Nuova nota"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <FormField label="Titolo *" name="title" errors={state.fieldErrors}>
            <Input id="title" name="title" defaultValue={note?.title} required />
          </FormField>
          <FormField label="Contenuto *" name="content" errors={state.fieldErrors}>
            <Textarea id="content" name="content" rows={5} defaultValue={note?.content} />
          </FormField>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Salvataggio…" : "Salva"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
