import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/legal/LegalDocShell";

export const metadata: Metadata = {
  title: "Cookie Policy | LACORE",
  description: "How LACORE uses cookies and similar technologies on lacore.ai."
};

export default function CookiePolicyPage() {
  return (
    <LegalDocShell title="Cookie Policy">
      <p>
        This Cookie Policy explains how LACORE (&quot;we,&quot; &quot;us&quot;) uses cookies and similar technologies on
        lacore.ai and related services. It should be read together with our{" "}
        <Link href="/privacy" style={{ color: "var(--accent)" }}>
          Privacy Policy
        </Link>
        .
      </p>

      <h2>What are cookies</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website. They help the site remember your
        preferences, keep you signed in, and understand how the site is used. Similar technologies include local storage
        and pixels. This policy refers to all of these as &quot;cookies&quot; unless we specify otherwise.
      </p>

      <h2>Cookies we use</h2>
      <ul>
        <li>
          <strong>Essential cookies:</strong> required for the Service to function, including authentication, session
          management, security (e.g., CSRF protection), and load balancing. These cannot usually be disabled without
          affecting core functionality.
        </li>
        <li>
          <strong>Functional cookies:</strong> remember choices such as theme (e.g., dark/light mode), language, or UI
          preferences to improve your experience.
        </li>
        <li>
          <strong>Analytics cookies:</strong> help us understand aggregate usage (e.g., page views, performance) so we can
          improve the product. Where used, they may be first-party or third-party as described below.
        </li>
      </ul>

      <h2>Third-party cookies</h2>
      <ul>
        <li>
          <strong>Vercel Analytics</strong> (or similar hosting/analytics tools provided by our infrastructure partner) may
          set cookies or use identifiers to measure performance and reliability of the application.
        </li>
        <li>
          <strong>Supabase</strong> authentication and API clients may use cookies or local storage to maintain sessions
          and secure access to your account and data.
        </li>
      </ul>
      <p>
        Third parties process data according to their own policies. We encourage you to review their documentation for
        details.
      </p>

      <h2>How to control cookies</h2>
      <p>
        Most browsers let you block or delete cookies through settings. Blocking essential cookies may prevent sign-in
        or break parts of the Service. You can also use private/incognito mode to limit persistent cookies. For
        advertising-related cookies (if introduced later), industry opt-out tools may apply; we will update this policy
        if our practices change.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this Cookie Policy:{" "}
        <a href="mailto:support@lacore.ai" style={{ color: "var(--accent)" }}>
          support@lacore.ai
        </a>
        .
      </p>
    </LegalDocShell>
  );
}
