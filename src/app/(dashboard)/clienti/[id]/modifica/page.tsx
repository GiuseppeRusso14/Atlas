import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "@/components/clienti/client-form";
import { updateClientAction } from "../../actions";

export const metadata = { title: "Modifica cliente" };

export default async function ModificaClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Modifica cliente" subtitle={client.name} />
      <ClientForm action={updateClientAction.bind(null, client.id)} client={client} />
    </div>
  );
}
