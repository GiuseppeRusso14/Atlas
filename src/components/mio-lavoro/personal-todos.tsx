"use client";

import { useActionState, useRef, useTransition } from "react";
import { Check, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PromoteTodoDialog } from "@/components/mio-lavoro/promote-todo-dialog";
import {
  addTodoAction,
  clearDoneTodosAction,
  deleteTodoAction,
  toggleTodoAction,
} from "@/app/(dashboard)/mio-lavoro/actions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PersonalTodo } from "@/generated/prisma/client";

const NONE = "__none__";

/**
 * To-do list personale con aggiunta inline (scadenza e ricorrenza opzionali),
 * spunta, promozione a task di progetto ed eliminazione.
 * In sola lettura (readOnly) quando l'ADMIN sta vedendo la board altrui.
 */
export function PersonalTodos({
  todos,
  projects = [],
  readOnly = false,
}: {
  todos: PersonalTodo[];
  projects?: { id: string; name: string }[];
  readOnly?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [, startTransition] = useTransition();
  const [state, formAction, isPending] = useActionState(
    async (prev: import("@/lib/action-result").ActionResult, formData: FormData) => {
      const result = await addTodoAction(prev, formData);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    { ok: true }
  );

  const doneCount = todos.filter((t) => t.done).length;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result?.ok === false) toast.error(result.error ?? "Operazione non riuscita.");
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>To-do personali</CardTitle>
        {!readOnly && doneCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => run(clearDoneTodosAction)}
          >
            Pulisci completate ({doneCount})
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {!readOnly ? (
          <form ref={formRef} action={formAction} className="mb-4 flex gap-2">
            <Input
              name="title"
              placeholder="Aggiungi una cosa da fare…"
              aria-label="Nuova to-do"
              autoComplete="off"
            />
            <Input
              name="dueDate"
              type="date"
              aria-label="Scadenza"
              className="w-40"
            />
            <Select name="repeat" defaultValue={NONE}>
              <SelectTrigger aria-label="Ripetizione" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Una volta</SelectItem>
                <SelectItem value="SETTIMANALE">Settimanale</SelectItem>
                <SelectItem value="MENSILE">Mensile</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" size="icon" aria-label="Aggiungi" disabled={isPending}>
              <Plus />
            </Button>
          </form>
        ) : null}
        {state.fieldErrors?.title ? (
          <p className="mb-2 text-sm text-destructive">{state.fieldErrors.title[0]}</p>
        ) : null}

        {todos.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nessuna to-do. {readOnly ? "" : "Aggiungi la prima qui sopra."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {todos.map((todo) => (
              <li key={todo.id} className="flex items-center gap-3 py-2.5">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => run(() => toggleTodoAction(todo.id))}
                  aria-label={todo.done ? "Segna da fare" : "Segna fatto"}
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    todo.done
                      ? "border-success bg-success text-success-foreground"
                      : "border-muted-foreground/40",
                    readOnly && "cursor-default"
                  )}
                >
                  {todo.done ? <Check className="size-3.5" /> : null}
                </button>
                <span
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-1.5 text-sm",
                    todo.done && "text-muted-foreground line-through"
                  )}
                >
                  <span className="truncate">{todo.title}</span>
                  {todo.repeat ? (
                    <Repeat
                      className="size-3 shrink-0 text-muted-foreground"
                      aria-label={
                        todo.repeat === "SETTIMANALE"
                          ? "Si ripete ogni settimana"
                          : "Si ripete ogni mese"
                      }
                    />
                  ) : null}
                </span>
                {todo.dueDate ? (
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      !todo.done && todo.dueDate < new Date()
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {formatDate(todo.dueDate)}
                  </span>
                ) : null}
                {!readOnly ? (
                  <div className="flex shrink-0 items-center">
                    {!todo.done && projects.length > 0 ? (
                      <PromoteTodoDialog
                        todoId={todo.id}
                        todoTitle={todo.title}
                        projects={projects}
                      />
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Elimina"
                      onClick={() => run(() => deleteTodoAction(todo.id))}
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
