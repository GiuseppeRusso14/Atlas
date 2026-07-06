import Link from "next/link";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import {
  BellRing,
  CalendarClock,
  PiggyBank,
  Receipt,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
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
import { DeleteIconButton } from "@/components/delete-icon-button";
import { ProfitEntryDialog } from "@/components/utile/profit-entry-dialog";
import { SubscriptionDialog } from "@/components/utile/subscription-dialog";
import { PaySubscriptionButton } from "@/components/utile/pay-subscription-button";
import { deleteProfitEntryAction, deleteSubscriptionAction } from "./actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Utile" };

export default async function UtilePage() {
  const now = new Date();
  const [entries, subscriptions, sums, acceptedQuotes, paidThisMonth] = await Promise.all([
    prisma.profitEntry.findMany({
      orderBy: { date: "desc" },
      take: 50,
      include: {
        user: { select: { name: true } },
        quote: { select: { id: true, number: true } },
      },
    }),
    prisma.subscription.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.profitEntry.groupBy({ by: ["type"], _sum: { amount: true } }),
    // preventivi accettati: opzioni per "da quale preventivo arrivano i soldi"
    prisma.quote.findMany({
      where: { status: "ACCETTATO" },
      orderBy: { number: "desc" },
      take: 30,
      include: { client: { select: { name: true } } },
    }),
    // spese già registrate nel mese corrente, per la checklist "da registrare"
    prisma.profitEntry.findMany({
      where: {
        type: "SPESA",
        subscriptionId: { not: null },
        date: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
      select: { subscriptionId: true },
    }),
  ]);

  // Checklist mensile: servizi attesi questo mese senza spesa registrata.
  // Mensili: sempre attesi. Annuali: attesi solo nel mese del rinnovo.
  const paidIds = new Set(paidThisMonth.map((e) => e.subscriptionId));
  const dueThisMonth = subscriptions.filter((s) => {
    if (!s.active || paidIds.has(s.id)) return false;
    if (s.billing === "MENSILE") return true;
    return (
      s.renewalDate !== null &&
      s.renewalDate.getMonth() === now.getMonth() &&
      s.renewalDate.getFullYear() === now.getFullYear()
    );
  });

  const totalIn = Number(
    sums.find((s) => s.type === "ACCANTONAMENTO")?._sum.amount ?? 0
  );
  const totalOut = Number(sums.find((s) => s.type === "SPESA")?._sum.amount ?? 0);
  const balance = totalIn - totalOut;

  // Costo mensile dei servizi attivi (gli annuali contati per 1/12).
  const monthlyCost = subscriptions
    .filter((s) => s.active)
    .reduce(
      (sum, s) => sum + Number(s.cost) / (s.billing === "ANNUALE" ? 12 : 1),
      0
    );
  const runwayMonths = monthlyCost > 0 ? Math.floor(balance / monthlyCost) : null;

  const quoteOptions = acceptedQuotes.map((q) => ({
    id: q.id,
    label: `${q.number} — ${q.client.name}`,
  }));

  return (
    <>
      <PageHeader
        title="Utile"
        subtitle="Accantonamenti dai guadagni e budget per i servizi aziendali"
      >
        <div className="flex items-center gap-2">
          <ProfitEntryDialog type="ACCANTONAMENTO" quotes={quoteOptions} />
          <ProfitEntryDialog type="SPESA" />
        </div>
      </PageHeader>

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Saldo disponibile"
          value={formatCurrency(balance)}
          icon={Wallet}
          highlight
        />
        <KpiCard
          label="Accantonato totale"
          value={formatCurrency(totalIn)}
          icon={PiggyBank}
        />
        <KpiCard
          label="Costo servizi al mese"
          value={formatCurrency(monthlyCost)}
          icon={TrendingDown}
        />
        <KpiCard
          label="Autonomia servizi"
          value={runwayMonths === null ? "—" : `${runwayMonths} mesi`}
          icon={CalendarClock}
        />
      </div>

      {/* Checklist mensile: manuale ma assistito — nessun addebito automatico */}
      {dueThisMonth.length > 0 ? (
        <Card className="mt-4 border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-4 text-primary" />
              Da registrare a {format(now, "MMMM", { locale: it })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {dueThisMonth.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(s.cost)} ·{" "}
                      {s.billing === "ANNUALE"
                        ? `rinnovo annuale${s.renewalDate ? ` il ${formatDate(s.renewalDate)}` : ""}`
                        : "canone mensile"}
                    </p>
                  </div>
                  <PaySubscriptionButton subscriptionId={s.id} name={s.name} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Abbonamenti / servizi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Servizi aziendali</CardTitle>
            <SubscriptionDialog />
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nessun servizio. Aggiungi Adobe, Figma, Claude e gli altri abbonamenti.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {subscriptions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-medium", !s.active && "text-muted-foreground line-through")}>
                        {s.name}
                        {s.active && s.reviewDate && s.reviewDate <= now ? (
                          <Badge
                            variant="secondary"
                            className="ml-2 border-transparent bg-destructive/10 text-destructive"
                          >
                            Da valutare
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(s.cost)} ·{" "}
                        {s.billing === "ANNUALE" ? "annuale" : "mensile"}
                        {s.renewalDate ? ` · rinnovo ${formatDate(s.renewalDate)}` : ""}
                        {s.reviewDate && s.reviewDate > now
                          ? ` · valutare entro ${formatDate(s.reviewDate)}`
                          : ""}
                        {s.notes ? ` · ${s.notes}` : ""}
                      </p>
                    </div>
                    {!s.active ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Disdetto
                      </Badge>
                    ) : (
                      <PaySubscriptionButton subscriptionId={s.id} name={s.name} />
                    )}
                    <div className="flex items-center">
                      <SubscriptionDialog
                        subscription={{
                          id: s.id,
                          name: s.name,
                          cost: s.cost.toString(),
                          billing: s.billing,
                          active: s.active,
                          renewalDate: s.renewalDate,
                          reviewDate: s.reviewDate,
                          notes: s.notes,
                        }}
                      />
                      <DeleteIconButton
                        action={deleteSubscriptionAction.bind(null, s.id)}
                        ariaLabel={`Elimina ${s.name}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Movimenti */}
        <Card>
          <CardHeader>
            <CardTitle>Movimenti</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nessun movimento. Registra il primo accantonamento.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const isIn = entry.type === "ACCANTONAMENTO";
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "flex size-6 shrink-0 items-center justify-center rounded-md",
                                isIn
                                  ? "bg-success/10 text-success"
                                  : "bg-destructive/10 text-destructive"
                              )}
                            >
                              {isIn ? (
                                <PiggyBank className="size-3.5" />
                              ) : (
                                <Receipt className="size-3.5" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm">{entry.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.user.name.split(" ")[0]}
                                {entry.quote ? (
                                  <>
                                    {" · da "}
                                    <Link
                                      href={`/preventivi/${entry.quote.id}`}
                                      className="hover:underline"
                                    >
                                      {entry.quote.number}
                                    </Link>
                                  </>
                                ) : null}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold whitespace-nowrap",
                            isIn ? "text-success" : "text-destructive"
                          )}
                        >
                          {isIn ? "+" : "−"}
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell>
                          <DeleteIconButton
                            action={deleteProfitEntryAction.bind(null, entry.id)}
                            ariaLabel="Elimina movimento"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Ultimi 50 movimenti. Un movimento può eliminarlo chi l&apos;ha
              registrato (o l&apos;admin).
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
