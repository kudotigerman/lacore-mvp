"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { PLANS, type PlanName } from "@/lib/plans";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type ProjectContextValue = {
  activeProject: Project | null;
  projects: Project[];
  setActiveProject: (project: Project) => void;
  createProject: (name: string) => Promise<Project>;
  isLoading: boolean;
};

export const ProjectContext = createContext<ProjectContextValue | null>(null);

const ACTIVE_PROJECT_KEY = "lacore_active_project";

export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjectContext must be used within ProjectProvider");
  return ctx;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("user_id", user.id)
          .maybeSingle();
        const planName = ((profile as { plan?: string } | null)?.plan || "free") as PlanName;
        const plan = PLANS[planName] ?? PLANS.free;

        const { data } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        let list = (data ?? []) as Project[];
        if (list.length === 0) {
          const { data: inserted } = await supabase
            .from("projects")
            .insert({ user_id: user.id, name: "My Project" } as never)
            .select("*")
            .single();
          if (inserted) list = [inserted as Project];
        }

        if (!cancelled) {
          setProjects(list);
          const saved = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_PROJECT_KEY) : null;
          const preferred = list.find((p) => p.id === saved) ?? list[0] ?? null;
          setActiveProjectState(preferred);
          if (preferred && typeof window !== "undefined") localStorage.setItem(ACTIVE_PROJECT_KEY, preferred.id);
          setIsLoading(false);
        }

        if (list.length > plan.maxProjects && plan.maxProjects !== Infinity) {
          // do not auto-delete anything; limit only enforced on create
        }
      } catch {
        if (!cancelled) {
          setProjects([]);
          setActiveProjectState(null);
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveProject = (project: Project) => {
    setActiveProjectState(project);
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
      window.location.reload();
    }
  };

  const createProject = async (name: string) => {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();
    const planName = ((profile as { plan?: string } | null)?.plan || "free") as PlanName;
    const plan = PLANS[planName] ?? PLANS.free;
    if (projects.length >= plan.maxProjects && plan.maxProjects !== Infinity) {
      throw new Error("Project limit reached for your plan.");
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: name.trim() || `Project ${projects.length + 1}`,
      } as never)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message || "Could not create project.");
    const p = data as Project;
    setProjects((prev) => [...prev, p]);
    setActiveProject(p);
    return p;
  };

  const value = useMemo(
    () => ({ activeProject, projects, setActiveProject, createProject, isLoading }),
    [activeProject, projects, isLoading]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
