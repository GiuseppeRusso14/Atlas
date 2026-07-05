import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { QuoteForm } from "@/components/preventivi/quote-form";
import { updateQuoteAction } from "../../actions";

export const metadata = { title: "Modifica preventivo" };

export default async function ModificaPreventivoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [quote, clients, projects] = await Promise.all([
    prisma.quote.findUnique({ where: { id }, include: { items: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, clientId: true },
    }),
  ]);
  if (!quote) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Modifica preventivo ${quote.number}`} />
      <QuoteForm
        action={updateQuoteAction.bind(null, quote.id)}
        clients={clients}
        projects={projects}
        quote={{
          id: quote.id,
          clientId: quote.clientId,
          projectId: quote.projectId,
          status: quote.status,
          issuedDate: quote.issuedDate,
          validUntil: quote.validUntil,
          notes: quote.notes,
          items: quote.items.map((item) => ({
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
          })),
        }}
      />
    </div>
  );
}
