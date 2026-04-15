import type { Metadata } from "next";
import Link from "next/link";
import { LacoreLegalLayout } from "@/components/legal/LacoreLegalLayout";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Privacy Policy | LACORE",
  description: "How LACORE collects, uses, and protects your personal information."
};

export default async function PrivacyPolicyPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <LacoreLegalLayout isLoggedIn={!!user}>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mb-12 text-sm text-white/40">Last updated: April 12, 2026</p>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">1. Information We Collect</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>Email address (via Google OAuth or email signup)</li>
            <li>Usage data (pages visited, features used)</li>
            <li>Payment information (processed by Paddle; we never store card data)</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">2. How We Use Your Information</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>To provide and improve LACORE services</li>
            <li>To send transactional emails (account, billing)</li>
            <li>To personalize your experience</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">3. Payment Processing</h2>
          <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-5">
            <p className="text-sm leading-relaxed text-white/70">
              Payments are processed by Paddle.com, our Merchant of Record. Paddle handles all payment data. We never
              store your payment card information. See{" "}
              <a
                href="https://paddle.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 underline-offset-2 hover:text-indigo-300"
              >
                paddle.com/privacy
              </a>
              .
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">4. Data Storage</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>Data stored on Supabase (EU servers)</li>
            <li>We retain data while your account is active</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">5. Your Rights</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>Access, correct, or delete your data</li>
            <li>
              Contact:{" "}
              <a href="mailto:support@lacore.ai" className="text-indigo-400 hover:text-indigo-300">
                support@lacore.ai
              </a>
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">6. Cookies</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>Essential cookies only for authentication</li>
            <li>No advertising cookies</li>
          </ul>
          <p className="mt-3 text-white/60 leading-relaxed">
            More detail in our{" "}
            <Link href="/cookies" className="text-indigo-400 hover:text-indigo-300">
              Cookie Policy
            </Link>
            .
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">7. Contact</h2>
          <p className="text-white/60 leading-relaxed">
            Email:{" "}
            <a href="mailto:support@lacore.ai" className="text-indigo-400 hover:text-indigo-300">
              support@lacore.ai
            </a>
          </p>
        </section>
        <p className="text-white/60 leading-relaxed">LACORE is a product operated by Relova AI.</p>
      </main>
    </LacoreLegalLayout>
  );
}
