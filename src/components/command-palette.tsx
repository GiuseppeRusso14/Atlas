"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, FolderPlus, Timer, UserPlus } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { navItemsFor } from "@/components/app-sidebar";

type SearchGroup = {
  label: string;
  items: { href: string; label: string; sublabel?: string }[];
};

/** Evento globale per aprire la palette da qualsiasi punto della UI. */
const OPEN_PALETTE_EVENT = "atlas:open-command-palette";

/** Apre la command palette (usato dal bottone "Azioni rapide" in sidebar). */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT));
}

/** Azioni rapide di creazione, oltre alla navigazione. */
const QUICK_ACTIONS = [
  { href: "/clienti/nuovo", label: "Nuovo cliente", icon: UserPlus },
  { href: "/progetti/nuovo", label: "Nuovo progetto", icon: FolderPlus },
  { href: "/preventivi/nuovo", label: "Nuovo preventivo", icon: FilePlus },
  { href: "/ore", label: "Registra ore", icon: Timer },
] as const;

/**
 * Command palette (⌘K / Ctrl+K): navigazione, azioni rapide e ricerca live
 * su clienti/progetti/task/preventivi (stesso endpoint /api/cerca della
 * ricerca in sidebar). Frecce per muoversi, Invio per aprire, Esc per chiudere.
 */
export function CommandPalette({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);

  // Scorciatoia globale ⌘K / Ctrl+K + evento dal bottone "Azioni rapide".
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpenEvent);
    };
  }, []);

  // Ricerca live (debounce): risultati dal DB oltre ai comandi statici.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cerca?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { groups: SearchGroup[] };
          setGroups(data.groups);
        }
      } catch {
        // richiesta annullata: ignora
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setGroups([]);
    router.push(href);
  }

  // Filtro manuale dei comandi statici (per i risultati remoti ci pensa l'API).
  const match = (label: string) =>
    query.trim().length === 0 ||
    label.toLowerCase().includes(query.trim().toLowerCase());
  const navItems = navItemsFor(isAdmin).filter((i) => match(i.label));
  const actions = QUICK_ACTIONS.filter((a) => match(a.label));
  const remote = query.trim().length >= 2 ? groups : [];
  const isEmpty =
    navItems.length === 0 && actions.length === 0 && remote.length === 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setQuery("");
          setGroups([]);
        }
      }}
      title="Command palette"
      description="Naviga, crea o cerca in tutto il gestionale"
    >
      <Command shouldFilter={false}>
      <CommandInput
        placeholder="Cerca o digita un comando…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isEmpty ? <CommandEmpty>Nessun risultato.</CommandEmpty> : null}

        {actions.length > 0 ? (
          <CommandGroup heading="Azioni rapide">
            {actions.map(({ href, label, icon: Icon }) => (
              <CommandItem key={href} value={`azione-${href}`} onSelect={() => go(href)}>
                <Icon /> {label}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {navItems.length > 0 ? (
          <CommandGroup heading="Vai a">
            {navItems.map(({ href, label, icon: Icon }) => (
              <CommandItem key={href} value={`nav-${href}`} onSelect={() => go(href)}>
                <Icon /> {label}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {remote.map((group) => (
          <div key={group.label}>
            <CommandSeparator />
            <CommandGroup heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={`${group.label}-${item.href}-${item.label}`}
                  value={`res-${group.label}-${item.href}-${item.label}`}
                  onSelect={() => go(item.href)}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.sublabel ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {item.sublabel}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
