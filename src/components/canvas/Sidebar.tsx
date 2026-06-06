"use client";

import { UserButton } from "@clerk/nextjs";
import {
  Bell,
  CalendarDays,
  Home,
  Lightbulb,
  MessageCircle,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Items with an `href` navigate; the rest are placeholders for now.
const TOP_NAV = [
  { Icon: Home, label: "Home", href: "/canvas" },
  { Icon: Lightbulb, label: "Ideas", href: "/creative" },
  { Icon: CalendarDays, label: "Calendar", href: "/plan" },
  { Icon: MessageCircle, label: "Chat", href: null },
] as const;

const BOTTOM_NAV = [
  { Icon: Bell, label: "Notifications" },
  { Icon: NotebookPen, label: "Notes" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-20 shrink-0 flex-col items-center gap-2 border-r border-[#f0f1f3] bg-white py-5">
      {TOP_NAV.map(({ Icon, label, href }) => {
        const active = href ? pathname.startsWith(href) : false;
        const cls = `grid h-11 w-11 place-items-center rounded-xl transition-colors ${
          active ? "bg-[#dce8fb]" : "hover:bg-[#f0f4fb]"
        }`;

        return href ? (
          <Link key={label} href={href} aria-label={label} className={cls}>
            <Icon className="h-6 w-6 text-[#3b7cf4]" strokeWidth={2} />
          </Link>
        ) : (
          <button key={label} type="button" aria-label={label} className={cls}>
            <Icon className="h-6 w-6 text-[#3b7cf4]" strokeWidth={2} />
          </button>
        );
      })}
      <div className="flex-1" />
      {BOTTOM_NAV.map(({ Icon, label }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          className="grid h-11 w-11 place-items-center rounded-xl transition-colors hover:bg-[#f0f4fb]"
        >
          <Icon className="h-6 w-6 text-[#3b7cf4]" strokeWidth={2} />
        </button>
      ))}
      <UserButton />
    </aside>
  );
}
