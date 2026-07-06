"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartColumn,
  Clock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  SquareCheckBig,
  Users,
  UsersRound,
  Zap,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { openCommandPalette } from "@/components/command-palette";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { brand, brandMonogram } from "@/config/brand";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mio-lavoro", label: "Il mio lavoro", icon: ListChecks },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/clienti", label: "Clienti", icon: Users },
  { href: "/progetti", label: "Progetti", icon: FolderKanban },
  { href: "/task", label: "Task", icon: SquareCheckBig },
  { href: "/preventivi", label: "Preventivi", icon: FileText },
  { href: "/ore", label: "Ore", icon: Clock },
  { href: "/report", label: "Report", icon: ChartColumn },
  { href: "/team", label: "Team", icon: UsersRound, adminOnly: true },
] as const;

/** Voci di navigazione visibili per il ruolo dato. */
export function navItemsFor(isAdmin: boolean) {
  return NAV_ITEMS.filter((item) => !("adminOnly" in item) || isAdmin);
}

const REPARTO_LABEL: Record<string, string> = {
  WEB: "Web",
  GRAFICA: "Grafica",
  SOCIAL: "Social",
};

type AppSidebarProps = {
  userName: string;
  userRole: "ADMIN" | "MEMBER";
  userReparto: string | null;
};

export function AppSidebar({ userName, userRole, userReparto }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen">
      {/* Logo: monogramma + nome, entrambi derivati dal brand config */}
      <div className="flex items-center gap-3 px-6 pb-6 pt-8">
        <span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-accent text-lg font-bold">
          {brandMonogram}
        </span>
        <div>
          <p className="text-lg font-bold leading-tight">{brand.name}</p>
          <p className="text-xs text-sidebar-foreground/70">{brand.tagline}</p>
        </div>
      </div>

      {/* Ricerca globale con anteprima dei risultati */}
      <GlobalSearch />

      {/* Apre la command palette (equivalente di ⌘K, per chi usa il mouse) */}
      <button
        type="button"
        onClick={openCommandPalette}
        className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-sidebar-border px-4 py-2.5 text-sm font-medium text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      >
        <Zap className="size-4.5" aria-hidden />
        Azioni rapide
        <kbd className="ml-auto rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold">
          ⌘K
        </kbd>
      </button>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItemsFor(userRole === "ADMIN").map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4.5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Card utente in fondo alla sidebar */}
      <div className="m-3 flex items-center gap-3 rounded-xl bg-sidebar-accent p-3">
        <UserButton appearance={{ elements: { avatarBox: "size-9" } }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{userName}</p>
          <p className="truncate text-xs text-sidebar-foreground/70">
            {userRole === "ADMIN" ? "Admin" : "Membro"}
            {userReparto ? ` · ${REPARTO_LABEL[userReparto] ?? userReparto}` : ""}
          </p>
        </div>
        <ThemeToggle className="shrink-0 text-sidebar-foreground hover:bg-sidebar/60 hover:text-sidebar-foreground" />
      </div>
    </aside>
  );
}
