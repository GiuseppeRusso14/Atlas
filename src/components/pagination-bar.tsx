"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Dimensione pagina standard delle liste. */
export const PAGE_SIZE = 25;

/** Legge e normalizza il query param `pagina` (1-based). */
export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/**
 * Barra di paginazione URL-driven (param `pagina`), conserva gli altri
 * filtri attivi. Non renderizza nulla se c'è una sola pagina.
 */
export function PaginationBar({
  page,
  totalCount,
  pageSize = PAGE_SIZE,
}: {
  page: number;
  totalCount: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalPages <= 1) return null;

  function goTo(target: number) {
    const params = new URLSearchParams(searchParams);
    if (target <= 1) params.delete("pagina");
    else params.set("pagina", String(target));
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Pagina {page} di {totalPages} · {totalCount} elementi
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft data-icon="inline-start" /> Precedente
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => goTo(page + 1)}
        >
          Successiva <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
