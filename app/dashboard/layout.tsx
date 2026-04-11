import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import DashboardChrome from "@/components/dashboard/DashboardChrome";
import { ProjectProvider } from "@/app/contexts/ProjectContext";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* layout cannot persist refreshed cookies; middleware handles writes */
        }
      }
    }
  );

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
