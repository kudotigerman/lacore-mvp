import type { Metadata } from "next";
import Link from "next/link";
import { LacoreLegalLayout } from "@/components/legal/LacoreLegalLayout";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Cookie Policy | LACORE",
  description: "How LACORE uses cookies on lacore.ai."
};

export default async function CookiePolicyPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <LacoreLegalLayout isLoggedIn={!!user}>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold text-white">Cookie Policy</h1>
        <p className="mb-12 text-sm text-white/40">Last updated: April 12, 2026</p>

        <p className="mb-10 text-white/60 leading-relaxed">
          This policy explains how LACORE uses cookies on lacore.ai. Read it alongside our{" "}
          <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">
            Privacy Policy
          </Link>
          .
        </p>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">1. What are cookies</h2>
          <p className="text-white/60 leading-relaxed">
            Cookies are small text files stored on your device when you visit a website. They help keep you signed in and
            let the service work securely. Similar technologies (such as local storage used for sessions) follow the same
            idea.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">2. Cookies we use</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>
              <span className="text-white/80">Authentication cookies (Supabase session)</span> — Essential for signing in
              and keeping your account secure.
            </li>
            <li>No advertising or tracking cookies</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">3. Managing cookies</h2>
          <p className="text-white/60 leading-relaxed">
            You can control or delete cookies through your browser settings. Blocking essential cookies may prevent you
            from signing in or using parts of LACORE.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">Contact</h2>
          <p className="text-white/60 leading-relaxed">
            Questions:{" "}
            <a href="mailto:support@lacore.ai" className="text-indigo-400 hover:text-indigo-300">
              support@lacore.ai
            </a>
          </p>
        </section>
      </main>
    </LacoreLegalLayout>
  );
}
