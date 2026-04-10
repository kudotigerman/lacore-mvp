import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import DashboardChrome from "@/components/dashboard/DashboardChrome";
import { ProjectProvider } from "@/app/contexts/ProjectContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <DashboardDataProvider>
        <DashboardChrome>{children}</DashboardChrome>
      </DashboardDataProvider>
    </ProjectProvider>
  );
}
