import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
import { PaginationBar } from "@/components/pagination-bar";
import { PAGE_SIZE, parsePage } from "@/lib/pagination";
import { InlineStatusSelect } from "@/components/inline-status-select";
import { QUOTE_STATUS } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/format";
import { updateQuoteStatusAction } from "./actions";
import type { Prisma, QuoteStatus } from "@/generated/prisma/client";

export const metadata = { title: "Preventivi" };

const QUOTE_STATUS_OPTIONS = Object.entries(QUOTE_STATUS).map(([value, s]) => ({
  value,
  label: s.label,
}));

type SearchParams = Promise<{ stato?: string; cliente?: string; pagina?: string }>;

export default async function PreventiviPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { stato, cliente, pagina } = await searchParams;
  const page = parsePage(pagina);

  const where: Prisma.QuoteWhereInput = {};
  if (stato && stato in QUOTE_STATUS) where.status = stato as QuoteStatus;
  if (cliente) where.clientId = cliente;

  const [quotes, totalCount, clients] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { number: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { client: true, project: true, items: true },
    }),
    prisma.quote.count({ where }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Preventivi" subtitle={`${totalCount} preventivi`}>
        <Button asChild>
          <Link href="/preventivi/nuovo">
            <Plus data-icon="inline-start" /> Nuovo preventivo
          </Link>
        </Button>
      </PageHeader>

      <FilterBar
        filters={[
          { param: "stato", label: "Stato", options: QUOTE_STATUS_OPTIONS },
          {
            param: "cliente",
            label: "Cliente",
            options: clients.map((c) => ({ value: c.id, label: c.name })),
          },
        ]}
      />

      <Card className="mt-4">
        <CardContent>
          {quotes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessun preventivo trovato.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Progetto</TableHead>
                  <TableHead>Emesso il</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => {
                  const total = quote.items.reduce(
                    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
                    0
                  );
                  return (
                    <TableRow key={quote.id}>
                      <TableCell>
                        <Link
                          href={`/preventivi/${quote.id}`}
                          className="font-semibold hover:underline"
                        >
                          {quote.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/clienti/${quote.clientId}`} className="hover:underline">
                          {quote.client.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {quote.project ? (
                          <Link
                            href={`/progetti/${quote.project.id}`}
                            className="hover:underline"
                          >
                            {quote.project.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{formatDate(quote.issuedDate)}</TableCell>
                      <TableCell>
                        <InlineStatusSelect
                          value={quote.status}
                          options={QUOTE_STATUS_OPTIONS}
                          action={updateQuoteStatusAction.bind(null, quote.id)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <PaginationBar page={page} totalCount={totalCount} />
        </CardContent>
      </Card>
    </>
  );
}
