import { redirect } from "next/navigation";

export default function DashboardClosingRedirectPage() {
  redirect("/dashboard/leads");
}
