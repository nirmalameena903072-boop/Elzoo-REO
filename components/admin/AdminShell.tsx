import Link from "next/link";
import type { ReactNode } from "react";
import { VoludWordmark } from "@/components/brand/Marks";
import { AdminNav } from "./AdminNav";

export function AdminShell({
  children,
  active,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  active: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] gap-0 px-0 sm:px-5">
      <aside className="sticky top-0 hidden h-dvh w-[212px] shrink-0 flex-col justify-between py-6 pr-4 lg:flex">
        <div>
          <Link href="/" aria-label="Volud home" className="block px-3">
            <VoludWordmark className="h-[22px] w-auto text-cream-0" />
          </Link>
          <p className="mt-2 px-3 text-[11px] text-cream-2">Alsa · Kanpur</p>
          <div className="mt-6">
            <AdminNav active={active} />
          </div>
        </div>
        <div className="px-3">
          <div className="rule mb-3" />
          <Link href="/demo" className="text-[11.5px] text-cream-2 underline underline-offset-4 hover:text-cream-1">
            Demo launcher
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-2 sm:pt-8">
        <div className="mb-1 flex lg:hidden">
          <AdminNav active={active} compact />
        </div>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="title text-cream-0">{title}</h1>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-cream-2">{subtitle}</p>}
          </div>
          {actions}
        </header>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
