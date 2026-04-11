import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import DashboardChrome from "@/components/dashboard/DashboardChrome";
import { ProjectProvider } from "@/app/contexts/ProjectContext";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <ProjectProvider>
      <DashboardDataProvider>
        <DashboardChrome>{children}</DashboardChrome>
      </DashboardDataProvider>
    </ProjectProvider>
  );
}
