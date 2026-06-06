"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { ConceptMeta } from "@/types/summarise";

interface Props {
  meta: ConceptMeta;
}

// Per-row accent. Kept as plain class strings so Tailwind can see them.
interface Accent {
  dot: string;
  label: string;
  border: string;
  hover: string;
}

interface Row {
  key: string;
  label: string;
  value: string;
  accent: Accent;
}

const ACCENTS: Record<string, Accent> = {
  concept: {
    dot: "bg-blue-500",
    label: "text-blue-600",
    border: "border-blue-100",
    hover: "hover:bg-blue-50/60",
  },
  tone: {
    dot: "bg-rose-500",
    label: "text-rose-600",
    border: "border-rose-100",
    hover: "hover:bg-rose-50/60",
  },
  audience: {
    dot: "bg-amber-500",
    label: "text-amber-600",
    border: "border-amber-100",
    hover: "hover:bg-amber-50/60",
  },
};

function AccordionItem({
  row,
  open,
  onToggle,
}: {
  row: Row;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const { accent } = row;

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white ${accent.border}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${accent.hover}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${accent.dot}`} />
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-widest ${accent.label}`}
        >
          {row.label}
        </span>
        {/* Collapsed preview — hidden once open so the panel owns the text. */}
        <span
          className={`min-w-0 flex-1 truncate text-[12px] font-medium text-gray-500 transition-opacity ${
            open ? "opacity-0" : "opacity-100"
          }`}
        >
          {row.value}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.section
            key="panel"
            id={panelId}
            aria-label={row.label}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {/* Capped + scrollable so a long value never overflows the page. */}
            <p className="max-h-28 overflow-y-auto px-3 pb-2.5 text-[13px] leading-relaxed text-gray-700">
              {row.value}
            </p>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ConceptMetaBar({ meta }: Props) {
  // Single-open accordion: at most one panel expanded → bounded height.
  const [openKey, setOpenKey] = useState<string | null>(null);

  const rows: Row[] = [
    {
      key: "concept",
      label: "Concept",
      value: meta.concept,
      accent: ACCENTS.concept,
    },
    { key: "tone", label: "Tone", value: meta.tone, accent: ACCENTS.tone },
    {
      key: "audience",
      label: "Audience",
      value: meta.targetAudience,
      accent: ACCENTS.audience,
    },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      {rows.map((row) => (
        <AccordionItem
          key={row.key}
          row={row}
          open={openKey === row.key}
          onToggle={() => setOpenKey((k) => (k === row.key ? null : row.key))}
        />
      ))}
    </div>
  );
}
