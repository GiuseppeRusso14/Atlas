"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

type Filter = {
  param: string;
  label: string;
  options: { value: string; label: string }[];
};

/**
 * Barra filtri basata sui query param dell'URL: ricerca testuale (param `q`)
 * + select multiple. Riusata da tutte le viste lista.
 */
export function FilterBar({
  searchPlaceholder,
  filters = [],
}: {
  searchPlaceholder?: string;
  filters?: Filter[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value && value !== ALL) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("pagina"); // cambiando filtro si riparte dalla prima pagina
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {searchPlaceholder ? (
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={searchPlaceholder}
            defaultValue={searchParams.get("q") ?? ""}
            onChange={(e) => setParam("q", e.target.value || null)}
          />
        </div>
      ) : null}
      {filters.map((filter) => (
        <Select
          key={filter.param}
          value={searchParams.get(filter.param) ?? ALL}
          onValueChange={(v) => setParam(filter.param, v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{filter.label}: tutti</SelectItem>
            {filter.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
