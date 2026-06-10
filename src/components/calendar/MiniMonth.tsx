"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { DOW_TINY, MONTHS, monthCells, toISO } from "./dateUtils";

interface Props {
  selectedISO: string;
  onSelect: (iso: string) => void;
}

// Dark mini month picker (left rail). Manages its own visible month; clicking a
// day reports the ISO date up so the week grid can jump to it.
export default function MiniMonth({ selectedISO, onSelect }: Props) {
  const today = new Date();
  const todayISO = toISO(today);
  const [cursor, setCursor] = useState(() => {
    const [y, m] = selectedISO.split("-").map(Number);
    return { year: y, month: m - 1 };
  });

  const cells = monthCells(cursor.year, cursor.month);

  function step(delta: number) {
    setCursor((c) => {
      const m = c.month + delta;
      if (m < 0) return { year: c.year - 1, month: 11 };
      if (m > 11) return { year: c.year + 1, month: 0 };
      return { ...c, month: m };
    });
  }

  return (
    <div className="rounded-2xl bg-gray-800 p-3 text-gray-200">
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous month"
          className="grid h-5 w-5 place-items-center rounded text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-xs font-semibold">
          {MONTHS[cursor.month]} {cursor.year}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next month"
          className="grid h-5 w-5 place-items-center rounded text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] text-gray-500">
        {DOW_TINY.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
        {cells.map((day, i) => {
          if (day === null)
            return <span key={`b-${cursor.month}-${i}`} className="py-1" />;
          const iso = toISO(new Date(cursor.year, cursor.month, day));
          const isToday = iso === todayISO;
          const isSelected = iso === selectedISO;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={`grid h-6 place-items-center rounded transition-colors ${
                isSelected
                  ? "bg-orange-500 text-white"
                  : isToday
                    ? "text-orange-400"
                    : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
