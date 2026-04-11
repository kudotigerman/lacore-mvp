import { createClient } from "@/utils/supabase/server";
import { HomePageClient } from "@/components/home/HomePageClient";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return <HomePageClient isLoggedIn={!!user} />;
}
