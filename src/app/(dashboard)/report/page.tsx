import { Fragment } from "react";
import Link from "next/link";
import { addMonths, format, parse, startOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, FileDown, FileText } from "lucide-react";
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
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { getMonthlyReport } from "@/lib/report";
import { formatCurrency, formatMinutes } from "@/lib/format";

export const metadata = { title: "Report" };

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ mese?: string }>;
}) {
  const { mese } = await searchParams;
  const month = mese
    ? parse(mese, "yyyy-MM", new Date())
    : startOfMonth(new Date());
  const monthParam = format(month, "yyyy-MM");
  const report = await getMonthlyReport(month);

  return (
    <>
      <PageHeader
        title="Report mensile"
        subtitle="Ore per cliente e progetto + preventivi accettati nel mese"
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link
              href={`/report?mese=${format(addMonths(month, -1), "yyyy-MM")}`}
              aria-label="Mese precedente"
            >
              <ChevronLeft />
            </Link>
          </Button>
          <p className="min-w-36 text-center font-semibold capitalize">
            {format(month, "MMMM yyyy", { locale: it })}
          </p>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link
              href={`/report?mese=${format(addMonths(month, 1), "yyyy-MM")}`}
              aria-label="Mese successivo"
            >
              <ChevronRight />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/api/report/csv?mese=${monthParam}`} download>
              <FileDown data-icon="inline-start" /> Esporta CSV
            </a>
          </Button>
        </div>
      </PageHeader>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Ore lavorate nel mese"
          value={formatMinutes(report.totalMinutes)}
          icon={Clock}
          highlight
        />
        <KpiCard
          label="Preventivi accettati nel mese"
          value={formatCurrency(report.totalQuotes)}
          icon={FileText}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dettaglio per cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {report.clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nessuna ora registrata né preventivo accettato in questo mese.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente / progetto</TableHead>
                  <TableHead className="text-right">Ore</TableHead>
                  <TableHead className="text-right">Preventivi accettati</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.clients.map((client) => (
                  <Fragment key={client.id}>
                    <TableRow className="bg-muted/40">
                      <TableCell>
                        <Link
                          href={`/clienti/${client.id}`}
                          className="font-semibold hover:underline"
                        >
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {client.minutes > 0 ? formatMinutes(client.minutes) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {client.quotesTotal > 0 ? formatCurrency(client.quotesTotal) : "—"}
                      </TableCell>
                    </TableRow>
                    {client.projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="pl-8 text-sm text-muted-foreground">
                          <Link href={`/progetti/${project.id}`} className="hover:underline">
                            {project.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatMinutes(project.minutes)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    ))}
                    {client.quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="pl-8 text-sm text-muted-foreground">
                          <Link href={`/preventivi/${quote.id}`} className="hover:underline">
                            Preventivo {quote.number}
                          </Link>
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right text-sm">
                          {formatCurrency(quote.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            I preventivi accettati sono attribuiti al mese della data di emissione.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
