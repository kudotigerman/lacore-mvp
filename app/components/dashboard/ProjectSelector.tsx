"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useProjectContext } from "@/app/contexts/ProjectContext";

export default function ProjectSelector() {
  const { projects, activeProject, setActiveProject, createProject, renameProject, isLoading } = useProjectContext();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const pendingSelectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  const clearPendingSelect = useCallback(() => {
    if (pendingSelectTimerRef.current) {
      clearTimeout(pendingSelectTimerRef.current);
      pendingSelectTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      clearPendingSelect();
      setEditingId(null);
      setDraft("");
    }
  }, [open, clearPendingSelect]);

  useEffect(() => () => clearPendingSelect(), [clearPendingSelect]);

  useLayoutEffect(() => {
    if (!editingId) return;
    const el = editInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editingId]);

  const commitRename = useCallback(
    async (p: { id: string; name: string }) => {
      const next = draft.trim();
      if (!next) {
        setEditingId(null);
        setDraft("");
        return;
      }
      if (next === p.name) {
        setEditingId(null);
        setDraft("");
        return;
      }
      try {
        await renameProject(p.id, next);
        setEditingId(null);
        setDraft("");
      } catch {
        /* keep inline editor open */
      }
    },
    [draft, renameProject]
  );

  if (isLoading) {
    return <div className="mt-2 text-xs text-white/35">Loading projects...</div>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/[0.08] bg-white/5 px-3 py-2 text-xs text-white/70"
      >
        <span className="truncate">{activeProject?.name || "Select project"}</span>
        <span className="text-white/35">▾</span>
      </button>
      {open ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 6px)",
            background: "#111116",
            border: "1px solid #1C1C22",
            borderRadius: 8,
            zIndex: 40,
            padding: 6
          }}
        >
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={(e) => {
                if (editingId === p.id) return;
                if (e.detail === 2) {
                  clearPendingSelect();
                  setEditingId(p.id);
                  setDraft(p.name);
                  return;
                }
                if (e.detail === 1) {
                  clearPendingSelect();
                  pendingSelectTimerRef.current = setTimeout(() => {
                    pendingSelectTimerRef.current = null;
                    setOpen(false);
                    setActiveProject(p);
                  }, 220);
                }
              }}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                borderRadius: 6,
                background: activeProject?.id === p.id ? "rgba(99,102,241,0.15)" : "transparent",
                color: activeProject?.id === p.id ? "#6366F1" : "#E4E4E7",
                padding: "8px 10px",
                fontSize: 12,
                cursor: "pointer",
                display: "block"
              }}
            >
              {editingId === p.id ? (
                <input
                  ref={editInputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Escape") {
                      e.preventDefault();
                      clearPendingSelect();
                      setEditingId(null);
                      setDraft("");
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void commitRename(p);
                    }
                  }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: 4,
                    border: "1px solid rgba(99,102,241,0.45)",
                    background: "rgba(0,0,0,0.35)",
                    color: "#FAFAFA",
                    padding: "6px 8px",
                    fontSize: 12,
                    outline: "none"
                  }}
                  aria-label="Project name"
                />
              ) : (
                <div className="group/name w-full">
                  <span className="block truncate">{p.name}</span>
                  <span
                    className="mt-0.5 block text-[10px] leading-tight text-white/30 opacity-0 transition-opacity duration-150 group-hover/name:opacity-100"
                    aria-hidden
                  >
                    Double-click to rename
                  </span>
                </div>
              )}
            </button>
          ))}
          <button
            type="button"
            disabled={creating}
            onClick={async () => {
              setCreating(true);
              try {
                await createProject(`Project ${projects.length + 1}`);
              } catch {
                /* temp: no plan-limit UI until Stripe */
              } finally {
                setCreating(false);
              }
            }}
            style={{
              width: "100%",
              marginTop: 4,
              border: "1px dashed #06B6D4",
              borderRadius: 6,
              background: "transparent",
              color: "#6366F1",
              fontSize: 12,
              padding: "8px 10px",
              cursor: creating ? "not-allowed" : "pointer"
            }}
          >
            + New Project
          </button>
        </div>
      ) : null}
    </div>
  );
}
