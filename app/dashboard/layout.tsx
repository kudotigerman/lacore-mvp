import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import DashboardChrome from "@/components/dashboard/DashboardChrome";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardDataProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardDataProvider>
  );
}
