import { endOfMonth, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";

/** Report mensile per cliente: ore per progetto + preventivi accettati. */
export type MonthlyReport = {
  clients: {
    id: string;
    name: string;
    minutes: number;
    projects: { id: string; name: string; minutes: number }[];
    quotes: { id: string; number: string; total: number }[];
    quotesTotal: number;
  }[];
  totalMinutes: number;
  totalQuotes: number;
};

export async function getMonthlyReport(month: Date): Promise<MonthlyReport> {
  const range = { gte: startOfMonth(month), lte: endOfMonth(month) };

  const [entries, acceptedQuotes] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { date: range },
      include: {
        project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
      },
    }),
    // Preventivi accettati emessi nel mese (riferimento: data emissione).
    prisma.quote.findMany({
      where: { status: "ACCETTATO", issuedDate: range },
      include: { items: true, client: { select: { id: true, name: true } } },
    }),
  ]);

  type ClientAgg = MonthlyReport["clients"][number];
  const byClient = new Map<string, ClientAgg>();
  const ensureClient = (id: string, name: string): ClientAgg => {
    let agg = byClient.get(id);
    if (!agg) {
      agg = { id, name, minutes: 0, projects: [], quotes: [], quotesTotal: 0 };
      byClient.set(id, agg);
    }
    return agg;
  };

  for (const entry of entries) {
    const client = ensureClient(entry.project.client.id, entry.project.client.name);
    client.minutes += entry.minutes;
    let project = client.projects.find((p) => p.id === entry.project.id);
    if (!project) {
      project = { id: entry.project.id, name: entry.project.name, minutes: 0 };
      client.projects.push(project);
    }
    project.minutes += entry.minutes;
  }

  for (const quote of acceptedQuotes) {
    const client = ensureClient(quote.client.id, quote.client.name);
    const total = quote.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0
    );
    client.quotes.push({ id: quote.id, number: quote.number, total });
    client.quotesTotal += total;
  }

  const clients = [...byClient.values()].sort((a, b) => b.minutes - a.minutes);
  for (const client of clients) {
    client.projects.sort((a, b) => b.minutes - a.minutes);
  }

  return {
    clients,
    totalMinutes: clients.reduce((s, c) => s + c.minutes, 0),
    totalQuotes: clients.reduce((s, c) => s + c.quotesTotal, 0),
  };
}
