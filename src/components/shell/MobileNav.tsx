"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./Sidebar";

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface/95 backdrop-blur lg:hidden">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
              active ? "text-brand" : "text-faint"
            }`}
          >
            {item.icon}
            <span className="leading-none">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
