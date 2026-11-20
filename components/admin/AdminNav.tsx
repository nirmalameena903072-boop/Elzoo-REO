"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/qr", label: "Tables & QR" },
  { href: "/admin/day-close", label: "Day close" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ active, compact = false }: { active: string; compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Owner sections"
      className={cn(
        compact
          ? "no-scrollbar -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-2"
          : "flex flex-col gap-0.5",
      )}
    >
      {ITEMS.map((item) => {
        const current = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-[9px] px-3 py-2 text-[13px] transition-colors",
              compact && "shrink-0 whitespace-nowrap px-2.5 py-1.5 text-[12px]",
              current
                ? "bg-white/[.07] text-cream-0"
                : "text-cream-2 hover:bg-white/[.035] hover:text-cream-1",
            )}
          >
            {item.label}
            {active === item.href.split("/").pop() && <span className="ml-2 hidden h-1 w-1 rounded-full bg-accent align-middle lg:inline-block" />}
          </Link>
        );
      })}
    </nav>
  );
}
