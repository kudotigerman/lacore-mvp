"use client";

import { useState } from "react";
import { useProjectContext } from "@/app/contexts/ProjectContext";

export default function ProjectSelector() {
  const { projects, activeProject, setActiveProject, createProject, isLoading } = useProjectContext();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return <div style={{ fontSize: 11, color: "#71717A", marginTop: 10 }}>Loading projects...</div>;
  }

  return (
    <div style={{ marginTop: 12, position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "1px solid #1C1C22",
          background: "#111116",
          color: "#FAFAFA",
          fontSize: 12,
          padding: "8px 10px",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeProject?.name || "Select project"}
        </span>
        <span style={{ color: "#71717A" }}>▾</span>
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
                background: activeProject?.id === p.id ? "rgba(6,182,212,0.15)" : "transparent",
                color: activeProject?.id === p.id ? "#06B6D4" : "#E4E4E7",
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
              setError(null);
              try {
                await createProject(`Project ${projects.length + 1}`);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not create project.");
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
              color: "#06B6D4",
              fontSize: 12,
              padding: "8px 10px",
              cursor: creating ? "not-allowed" : "pointer",
            }}
          >
            + New Project
          </button>
          {error ? <p style={{ margin: "6px 6px 2px", fontSize: 11, color: "#ef4444" }}>{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
