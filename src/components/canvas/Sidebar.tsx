"use client";

import { UserButton } from "@clerk/nextjs";
import { CalendarDays, Home, Lightbulb } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TOP_NAV = [
  { Icon: Home, label: "Home", href: "/creative" },
  { Icon: Lightbulb, label: "Ideas", href: "/creative" },
  { Icon: CalendarDays, label: "Calendar", href: "/plan" },
] as const;

// { Icon: MessageCircle, label: "Chat", href: null },
// { Icon: Bell, label: "Notifications" },
// { Icon: NotebookPen, label: "Notes" },

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-20 shrink-0 flex-col items-center gap-2 border-r border-[#f0f1f3] bg-white py-5">
      {TOP_NAV.map(({ Icon, label, href }) => {
        const active = pathname.startsWith(href);
        const cls = `grid h-11 w-11 place-items-center rounded-xl transition-colors ${
          active ? "bg-[#dce8fb]" : "hover:bg-[#f0f4fb]"
        }`;
        return (
          <Link key={label} href={href} aria-label={label} className={cls}>
            <Icon className="h-6 w-6 text-[#3b7cf4]" strokeWidth={2} />
          </Link>
        );
      })}
      <div className="flex-1" />
      <UserButton />
    </aside>
  );
}
