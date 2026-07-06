"use client";

import { useTransition } from "react";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { paySubscriptionAction } from "@/app/(dashboard)/utile/actions";

/** Registra in un click la spesa del canone (importo dal servizio). */
export function PaySubscriptionButton({
  subscriptionId,
  name,
}: {
  subscriptionId: string;
  name: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await paySubscriptionAction(subscriptionId);
          if (result?.ok === false) {
            toast.error(result.error ?? "Operazione non riuscita.");
          } else {
            toast.success(`Pagamento di ${name} registrato.`);
          }
        })
      }
    >
      <Receipt data-icon="inline-start" />
      {isPending ? "Registro…" : "Registra pagamento"}
    </Button>
  );
}
