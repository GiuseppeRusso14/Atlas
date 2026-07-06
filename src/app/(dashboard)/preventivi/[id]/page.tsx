import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { InlineStatusSelect } from "@/components/inline-status-select";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { QUOTE_STATUS } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  createProjectFromQuoteAction,
  deleteQuoteAction,
  updateQuoteStatusAction,
} from "../actions";

export const metadata = { title: "Dettaglio preventivo" };

const QUOTE_STATUS_OPTIONS = Object.entries(QUOTE_STATUS).map(([value, s]) => ({
  value,
  label: s.label,
}));

export default async function PreventivoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [quote, setAside] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: { client: true, project: true, items: true },
    }),
    // quanto di questo preventivo è già stato accantonato nell'utile
    prisma.profitEntry.aggregate({
      where: { quoteId: id, type: "ACCANTONAMENTO" },
      _sum: { amount: true },
    }),
  ]);
  if (!quote) notFound();
  const setAsideTotal = Number(setAside._sum.amount ?? 0);

  const total = quote.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: "Preventivi", href: "/preventivi" },
          { label: quote.number },
        ]}
      />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clienti/${quote.clientId}`} className="hover:underline">
              {quote.client.name}
            </Link>
            {quote.project ? (
              <>
                {" · "}
                <Link href={`/progetti/${quote.project.id}`} className="hover:underline">
                  {quote.project.name}
                </Link>
              </>
            ) : null}
          </p>
          <h1 className="mt-1 text-2xl font-bold">Preventivo {quote.number}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InlineStatusSelect
            value={quote.status}
            options={QUOTE_STATUS_OPTIONS}
            action={updateQuoteStatusAction.bind(null, quote.id)}
          />
          {quote.status === "ACCETTATO" && !quote.projectId ? (
            <form action={createProjectFromQuoteAction.bind(null, quote.id)}>
              <Button type="submit">
                <FolderPlus data-icon="inline-start" /> Crea progetto
              </Button>
            </form>
          ) : null}
          <Button variant="outline" asChild>
            <Link href={`/preventivi/${quote.id}/stampa`} target="_blank">
              <FileDown data-icon="inline-start" /> Scarica PDF
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/preventivi/${quote.id}/modifica`}>
              <Pencil data-icon="inline-start" /> Modifica
            </Link>
          </Button>
          <ConfirmActionButton
            action={deleteQuoteAction.bind(null, quote.id)}
            label={
              <>
                <Trash2 data-icon="inline-start" /> Elimina
              </>
            }
            variant="destructive"
            title="Eliminare il preventivo?"
            description={`Il preventivo ${quote.number} e le sue righe verranno eliminati definitivamente.`}
            confirmLabel="Elimina"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Righe</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrizione</TableHead>
                <TableHead className="text-right">Qtà</TableHead>
                <TableHead className="text-right">Prezzo unitario</TableHead>
                <TableHead className="text-right">Importo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-semibold">
                  Totale
                </TableCell>
                <TableCell className="text-right text-lg font-bold">
                  {formatCurrency(total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Emesso il</dt>
            <dd>{formatDate(quote.issuedDate)}</dd>
            <dt className="text-muted-foreground">Valido fino al</dt>
            <dd>{formatDate(quote.validUntil)}</dd>
            {setAsideTotal > 0 ? (
              <>
                <dt className="text-muted-foreground">Accantonato nell&apos;utile</dt>
                <dd>
                  <Link href="/utile" className="font-medium text-success hover:underline">
                    {formatCurrency(setAsideTotal)}
                  </Link>
                </dd>
              </>
            ) : null}
          </dl>
          {quote.notes ? (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
              {quote.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
