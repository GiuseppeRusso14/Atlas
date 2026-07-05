import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "@/components/clienti/client-form";
import { createClientAction } from "../actions";

export const metadata = { title: "Nuovo cliente" };

export default function NuovoClientePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[{ label: "Clienti", href: "/clienti" }, { label: "Nuovo" }]}
      />
      <PageHeader title="Nuovo cliente" subtitle="Anagrafica del cliente" />
      <ClientForm action={createClientAction} />
    </div>
  );
}
