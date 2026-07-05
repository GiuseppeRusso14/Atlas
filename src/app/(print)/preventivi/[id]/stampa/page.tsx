import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { brand, brandMonogram } from "@/config/brand";
import { QUOTE_STATUS } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata = { title: "Stampa preventivo" };

/**
 * Versione stampabile del preventivo (A4). "Scarica PDF" = stampa del
 * browser → Salva come PDF: zero dipendenze, impaginazione affidabile.
 * Il documento usa colori fissi da carta (non i token del tema UI).
 */
export default async function StampaPreventivoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { client: true, project: true, items: true },
  });
  if (!quote) notFound();

  const total = quote.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0
  );

  return (
    <div className="mx-auto max-w-3xl px-8 py-10 print:max-w-none print:px-0 print:py-0">
      {/* Barra azioni: non compare in stampa */}
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Button variant="outline" asChild>
          <Link href={`/preventivi/${quote.id}`}>
            <ArrowLeft data-icon="inline-start" /> Torna al preventivo
          </Link>
        </Button>
        <PrintButton />
      </div>

      {/* ---------- Documento ---------- */}
      {/* Carta intestata dal brand config */}
      <header className="flex items-start justify-between border-b-2 border-[#F26E52] pb-6">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-[#F26E52] text-2xl font-bold text-white">
            {brandMonogram}
          </span>
          <div>
            <p className="text-xl font-bold">{brand.name}</p>
            <p className="text-sm text-[#8A8F9A]">{brand.tagline}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">Preventivo {quote.number}</p>
          <p className="mt-1 text-sm text-[#8A8F9A]">
            {QUOTE_STATUS[quote.status].label}
          </p>
        </div>
      </header>

      {/* Destinatario e date */}
      <section className="mt-8 flex justify-between gap-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8A8F9A]">
            Spett.le
          </p>
          <p className="mt-1 text-lg font-semibold">{quote.client.name}</p>
          {quote.client.vatNumber ? <p className="text-sm">P.IVA {quote.client.vatNumber}</p> : null}
          {quote.client.address ? <p className="text-sm">{quote.client.address}</p> : null}
          {quote.client.email ? <p className="text-sm">{quote.client.email}</p> : null}
        </div>
        <div className="text-right text-sm">
          <p>
            <span className="text-[#8A8F9A]">Data emissione: </span>
            {formatDate(quote.issuedDate)}
          </p>
          <p className="mt-1">
            <span className="text-[#8A8F9A]">Valido fino al: </span>
            {formatDate(quote.validUntil)}
          </p>
          {quote.project ? (
            <p className="mt-1">
              <span className="text-[#8A8F9A]">Progetto: </span>
              {quote.project.name}
            </p>
          ) : null}
        </div>
      </section>

      {/* Righe */}
      <table className="mt-10 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-[#101827] text-left">
            <th className="pb-2 font-semibold">Descrizione</th>
            <th className="pb-2 text-right font-semibold">Qtà</th>
            <th className="pb-2 text-right font-semibold">Prezzo unit.</th>
            <th className="pb-2 text-right font-semibold">Importo</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item) => (
            <tr key={item.id} className="border-b border-[#EAE4DE]">
              <td className="py-3 pr-4">{item.description}</td>
              <td className="py-3 text-right">{Number(item.quantity)}</td>
              <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
              <td className="py-3 text-right font-medium">
                {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-4 text-right text-base font-semibold">
              Totale
            </td>
            <td className="pt-4 text-right text-xl font-bold text-[#F26E52]">
              {formatCurrency(total)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Note */}
      {quote.notes ? (
        <section className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8A8F9A]">
            Note
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{quote.notes}</p>
        </section>
      ) : null}

      <footer className="mt-16 border-t border-[#EAE4DE] pt-4 text-center text-xs text-[#8A8F9A]">
        {brand.name} — {brand.tagline} · Preventivo {quote.number} ·{" "}
        {formatDate(quote.issuedDate ?? quote.createdAt)}
      </footer>
    </div>
  );
}
