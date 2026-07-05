"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type SearchGroup = {
  label: string;
  items: { href: string; label: string; sublabel?: string }[];
};

/**
 * Ricerca globale della sidebar con anteprima live: da 2 caratteri in su
 * interroga /api/cerca (debounce 250ms) e mostra i primi risultati
 * cliccabili. Invio → pagina /cerca con tutti i risultati.
 */
export function GlobalSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debounce + fetch dei suggerimenti (annulla la richiesta precedente).
  // Il reset per query corte avviene nell'onChange, non qui.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cerca?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { groups: SearchGroup[] };
          setGroups(data.groups);
          setOpen(true);
        }
      } catch {
        // richiesta annullata o rete: ignora
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // Chiudi cliccando fuori.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative mx-3 mb-3">
      <form
        action="/cerca"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) go(`/cerca?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/60" />
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (value.trim().length < 2) {
              setGroups([]);
              setOpen(false);
            }
          }}
          onFocus={() => groups.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Cerca…"
          autoComplete="off"
          aria-label="Cerca in tutto il gestionale"
          className="w-full rounded-xl bg-sidebar-accent py-2 pl-9 pr-3 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/60 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        />
      </form>

      {/* Anteprima risultati */}
      {open ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-lg">
          {groups.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              {loading ? "Ricerca…" : "Nessun risultato"}
            </p>
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={item.href + item.label}
                      type="button"
                      onClick={() => go(item.href)}
                      className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <span className="w-full truncate font-medium">{item.label}</span>
                      {item.sublabel ? (
                        <span className="w-full truncate text-xs text-muted-foreground">
                          {item.sublabel}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ))}
              <button
                type="button"
                onClick={() => go(`/cerca?q=${encodeURIComponent(query.trim())}`)}
                className="mt-1 w-full border-t border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent"
              >
                Vedi tutti i risultati per “{query.trim()}”
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
