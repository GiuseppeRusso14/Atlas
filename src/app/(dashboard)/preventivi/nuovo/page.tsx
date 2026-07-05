import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { QuoteForm } from "@/components/preventivi/quote-form";
import { createQuoteAction } from "../actions";

export const metadata = { title: "Nuovo preventivo" };

export default async function NuovoPreventivoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;
  const [clients, projects] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, clientId: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[{ label: "Preventivi", href: "/preventivi" }, { label: "Nuovo" }]}
      />
      <PageHeader
        title="Nuovo preventivo"
        subtitle="Il numero progressivo viene assegnato automaticamente"
      />
      <QuoteForm
        action={createQuoteAction}
        clients={clients}
        projects={projects}
        defaultClientId={cliente}
      />
    </div>
  );
}
