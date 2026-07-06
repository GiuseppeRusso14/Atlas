"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Zap } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { openCommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navItemsFor } from "@/components/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { brand, brandMonogram } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Barra superiore mobile con menu a scomparsa (sotto md la sidebar è nascosta). */
export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-sm font-bold">
          {brandMonogram}
        </span>
        <span className="font-bold">{brand.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
        <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Apri menu"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground">
            <SheetHeader>
              <SheetTitle className="text-sidebar-foreground">{brand.name}</SheetTitle>
            </SheetHeader>
            <GlobalSearch onNavigate={() => setOpen(false)} />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openCommandPalette();
              }}
              className="mx-2 mb-2 flex items-center gap-3 rounded-xl border border-sidebar-border px-4 py-2.5 text-sm font-medium text-sidebar-foreground/90 hover:bg-sidebar-accent/60"
            >
              <Zap className="size-4.5" aria-hidden />
              Azioni rapide
            </button>
            <nav className="flex flex-col gap-1 px-2">
              {navItemsFor(isAdmin).map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
                    )}
                  >
                    <Icon className="size-4.5" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
