"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  SquareCheckBig,
  Users,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { brand, brandMonogram } from "@/config/brand";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clienti", label: "Clienti", icon: Users },
  { href: "/progetti", label: "Progetti", icon: FolderKanban },
  { href: "/task", label: "Task", icon: SquareCheckBig },
  { href: "/preventivi", label: "Preventivi", icon: FileText },
  { href: "/ore", label: "Ore", icon: Clock },
] as const;

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

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{userName}</p>
          <p className="truncate text-xs text-sidebar-foreground/70">
            {userRole === "ADMIN" ? "Admin" : "Membro"}
            {userReparto ? ` · ${REPARTO_LABEL[userReparto] ?? userReparto}` : ""}
          </p>
        </div>
      </div>
    </aside>
  );
}
