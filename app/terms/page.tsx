import type { Metadata } from "next";
import { LacoreLegalLayout } from "@/components/legal/LacoreLegalLayout";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Terms of Service | LACORE",
  description: "Terms governing your use of the LACORE platform at lacore.ai."
};

export default async function TermsOfServicePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <LacoreLegalLayout isLoggedIn={!!user}>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold text-white">Terms of Service</h1>
        <p className="mb-12 text-sm text-white/40">Last updated: April 12, 2026</p>

        <div className="mb-10 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-5">
          <p className="text-sm leading-relaxed text-white/70">
            Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all
            our orders. Paddle provides all customer service inquiries and handles returns.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">1. Service Description</h2>
          <p className="text-white/60 leading-relaxed">
            LACORE is an AI-powered sales system for freelancers and consultants. We provide: offer generation, landing
            pages, content creation, and lead management tools.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">2. Accounts</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>Must be 18+ to use the service</li>
            <li>Responsible for account security</li>
            <li>One account per person</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">3. Subscriptions &amp; Billing</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>Monthly and annual subscription plans available</li>
            <li>Billed through Paddle.com as Merchant of Record</li>
            <li>Prices may change with 30 days notice</li>
            <li>Cancel anytime from Settings → Billing</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">4. Credits</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>Credits are consumed when using AI features</li>
            <li>Unused monthly credits do not roll over (except purchased top-ups)</li>
            <li>Purchased credit top-ups never expire</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">5. Refund Policy</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>30-day money-back guarantee on first subscription</li>
            <li>No refunds after 30 days</li>
            <li>Credit top-ups are non-refundable after use</li>
            <li>
              Refund requests:{" "}
              <a href="mailto:support@lacore.ai" className="text-indigo-400 hover:text-indigo-300">
                support@lacore.ai
              </a>{" "}
              or via Paddle portal
            </li>
            <li>Refunds processed by Paddle within 5–10 business days</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">6. Acceptable Use</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>No spam, illegal content, or misleading claims</li>
            <li>AI-generated content is your responsibility</li>
            <li>We may suspend accounts that violate these terms</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">7. Intellectual Property</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>Content you create belongs to you</li>
            <li>LACORE retains rights to the platform and AI models</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">8. Limitation of Liability</h2>
          <ul className="list-disc space-y-2 pl-5 text-white/60 leading-relaxed">
            <li>Service provided &quot;as is&quot;</li>
            <li>Not liable for indirect damages</li>
            <li>Maximum liability: amount paid in last 3 months</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-white">9. Contact</h2>
          <p className="text-white/60 leading-relaxed">
            Email:{" "}
            <a href="mailto:support@lacore.ai" className="text-indigo-400 hover:text-indigo-300">
              support@lacore.ai
            </a>
          </p>
          <p className="mt-2 text-white/60 leading-relaxed">Company: LACORE</p>
        </section>
        <p className="text-white/60 leading-relaxed">LACORE is a product operated by Relova AI.</p>
      </main>
    </LacoreLegalLayout>
  );
}
