"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  addScript,
  clearDraft,
  getDraft,
  type ScriptDraft,
  saveDraft,
} from "@/utils/creative";
import CraftScriptPanel from "./CraftScriptPanel";
import CreativeHelperSidebar from "./CreativeHelperSidebar";

const EMPTY_DRAFT: ScriptDraft = { purpose: "", intro: "", outro: "" };

export default function CreativeComposeClient() {
  const router = useRouter();
  const params = useSearchParams();
  const folder = params.get("folder") ?? "f-default";

  // Draft is persisted (per folder) so leaving the page and coming back keeps
  // the answers. Seeded once from storage on mount; cleared on submit when it
  // becomes a real script.
  const [draft, setDraft] = useState<ScriptDraft>(() => EMPTY_DRAFT);
  const [collapsed, setCollapsed] = useState(false);
  const restored = useRef(false);

  // Restore saved draft once on mount (storage is client-only).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = getDraft(folder);
    if (saved) setDraft(saved);
  }, [folder]);

  // Persist edits, debounced so we don't write on every keystroke.
  useEffect(() => {
    if (!restored.current) return;
    const t = setTimeout(() => saveDraft(folder, draft), 400);
    return () => clearTimeout(t);
  }, [folder, draft]);

  const canSubmit = Object.values(draft).some((v) => v.trim().length > 0);

  function handleChange(key: keyof ScriptDraft, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const script = addScript(folder, draft);
    // Draft is now committed to a script — drop the working copy.
    clearDraft(folder);
    // push() keeps the compose page in history so the canvas can navigate back.
    router.push(`/mind-map?script=${encodeURIComponent(script.id)}`);
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      {!collapsed && (
        <div className="hidden md:flex">
          <CreativeHelperSidebar />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-9">
        <CraftScriptPanel
          draft={draft}
          onChange={handleChange}
          onSubmit={handleSubmit}
          canSubmit={canSubmit}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onBack={() => router.back()}
        />
      </div>
    </div>
  );
}
