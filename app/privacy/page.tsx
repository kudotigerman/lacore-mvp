import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/legal/LegalDocShell";

export const metadata: Metadata = {
  title: "Privacy Policy | LACORE",
  description: "How LACORE collects, uses, and protects your personal information."
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocShell title="Privacy Policy">
      <p>
        LACORE (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the lacore.ai platform. This Privacy Policy
        explains how we collect, use, disclose, and safeguard information when you use our services. By using LACORE, you
        agree to this policy. If you do not agree, please do not use our services.
      </p>

      <h2>What information we collect</h2>
      <p>We may collect the following categories of information:</p>
      <ul>
        <li>
          <strong>Account and contact data:</strong> email address, display name, and authentication identifiers when you
          register or sign in (including via third-party providers where applicable).
        </li>
        <li>
          <strong>Business and content data:</strong> information you provide about your business, offers, audience,
          pricing, positioning, headlines, landing page content, lead form submissions, and materials you upload or
          generate through the platform.
        </li>
        <li>
          <strong>Usage data:</strong> how you interact with the service (e.g., features used, timestamps, approximate
          device/browser type, and diagnostic logs) to operate and improve the product.
        </li>
        <li>
          <strong>Cookies and similar technologies:</strong> as described in our{" "}
          <Link href="/cookies" style={{ color: "var(--accent)" }}>
            Cookie Policy
          </Link>
          .
        </li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To provide, maintain, and secure the LACORE platform and your account.</li>
        <li>To generate and deliver AI-assisted outputs (e.g., offers, copy, content) based on your inputs.</li>
        <li>To send service-related and transactional communications (e.g., security alerts, product updates).</li>
        <li>To send optional notifications you have opted into (e.g., email or integrations such as Telegram).</li>
        <li>To analyze usage in aggregate to improve features, reliability, and user experience.</li>
        <li>To comply with legal obligations and enforce our Terms of Service.</li>
      </ul>

      <h2>Data storage</h2>
      <p>
        We use Supabase and other cloud infrastructure to store and process data. Servers and subprocessors may be located
        in the European Union, the United States, or other regions where our providers operate. We implement appropriate
        technical and organizational measures to protect your information; no method of transmission over the Internet is
        100% secure.
      </p>

      <h2>Third-party services</h2>
      <p>We rely on service providers that may process data on our behalf, including:</p>
      <ul>
        <li>
          <strong>Anthropic (Claude)</strong> and <strong>OpenAI</strong> — AI processing for features such as offer
          generation, chat, and content tools.
        </li>
        <li>
          <strong>Resend</strong> — transactional and notification email delivery.
        </li>
        <li>
          <strong>Vercel</strong> — hosting and deployment of the application.
        </li>
        <li>
          <strong>Stripe</strong> — payment processing when billing or paid features are enabled (subject to
          Stripe&apos;s privacy policy).
        </li>
        <li>
          <strong>Telegram</strong> — optional notifications or bot interactions when you connect or configure them.
        </li>
        <li>
          <strong>Supabase</strong> — authentication, database, and related backend services.
        </li>
      </ul>
      <p>
        These providers have their own privacy policies. We recommend reviewing them. We do not sell your personal
        information.
      </p>

      <h2>Cookies policy</h2>
      <p>
        We use cookies and similar technologies for essential operation, preferences, and analytics where applicable.
        Details are set out in our{" "}
        <Link href="/cookies" style={{ color: "var(--accent)" }}>
          Cookie Policy
        </Link>
        .
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, delete, or export your personal data;
        restrict or object to certain processing; and withdraw consent where processing is consent-based. To exercise
        these rights, contact us at the email below. We will respond within a reasonable timeframe and as required by
        applicable law.
      </p>

      <h2>Data retention</h2>
      <p>
        We retain information for as long as your account is active or as needed to provide the service, comply with
        legal obligations, resolve disputes, and enforce our agreements. When data is no longer required, we delete or
        anonymize it in accordance with our practices and applicable law.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will post the revised version on this page and update
        the &quot;Last updated&quot; date. Material changes may be communicated through the service or by email where
        appropriate. Continued use after changes constitutes acceptance of the updated policy.
      </p>

      <h2>Contact information</h2>
      <p>
        For privacy-related questions or requests, contact us at{" "}
        <a href="mailto:support@lacore.ai" style={{ color: "var(--accent)" }}>
          support@lacore.ai
        </a>
        .
      </p>
    </LegalDocShell>
  );
}
