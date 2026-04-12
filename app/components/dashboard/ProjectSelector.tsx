"use client";

import { useState } from "react";
import { useProjectContext } from "@/app/contexts/ProjectContext";

export default function ProjectSelector() {
  const { projects, activeProject, setActiveProject, createProject, isLoading } = useProjectContext();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

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
            padding: 6,
          }}
        >
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setOpen(false);
                setActiveProject(p);
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
              }}
            >
              {p.name}
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
              cursor: creating ? "not-allowed" : "pointer",
            }}
          >
            + New Project
          </button>
        </div>
      ) : null}
    </div>
  );
}
