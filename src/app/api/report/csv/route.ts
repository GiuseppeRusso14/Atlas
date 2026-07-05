import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { format, parse, startOfMonth } from "date-fns";
import { getMonthlyReport } from "@/lib/report";

/** Export CSV del report mensile (righe piatte: ore per progetto + preventivi). */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const mese = req.nextUrl.searchParams.get("mese");
  const month = mese
    ? parse(mese, "yyyy-MM", new Date())
    : startOfMonth(new Date());
  const report = await getMonthlyReport(month);

  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const rows: string[] = ["tipo;cliente;dettaglio;ore;importo_eur"];
  for (const client of report.clients) {
    for (const project of client.projects) {
      rows.push(
        ["ore", esc(client.name), esc(project.name), (project.minutes / 60).toFixed(2).replace(".", ","), ""].join(";")
      );
    }
    for (const quote of client.quotes) {
      rows.push(
        ["preventivo_accettato", esc(client.name), esc(quote.number), "", quote.total.toFixed(2).replace(".", ",")].join(";")
      );
    }
  }
  rows.push(
    ["totale", "", "", (report.totalMinutes / 60).toFixed(2).replace(".", ","), report.totalQuotes.toFixed(2).replace(".", ",")].join(";")
  );

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${format(month, "yyyy-MM")}.csv"`,
    },
  });
}
