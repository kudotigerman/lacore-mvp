import type { Metadata } from "next";
import { LegalDocShell } from "@/components/legal/LegalDocShell";

export const metadata: Metadata = {
  title: "Terms of Service | LACORE",
  description: "Terms governing your use of the LACORE platform at lacore.ai."
};

export default function TermsOfServicePage() {
  return (
    <LegalDocShell title="Terms of Service">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of LACORE&apos;s website, applications,
        and services at lacore.ai (collectively, the &quot;Service&quot;), operated by LACORE (&quot;LACORE,&quot;
        &quot;we,&quot; &quot;us&quot;). By creating an account or using the Service, you agree to these Terms. If you
        disagree, do not use the Service.
      </p>

      <h2>Acceptance of terms</h2>
      <p>
        You represent that you are of legal age to enter a binding contract in your jurisdiction and that your use of the
        Service complies with applicable laws. If you use the Service on behalf of an organization, you represent that
        you have authority to bind that organization to these Terms.
      </p>

      <h2>Description of service</h2>
      <p>
        LACORE provides software tools to help businesses define offers, generate landing pages and marketing content,
        capture leads, and related sales workflows. Features may change over time. The Service is provided &quot;as
        is&quot; and may be modified, suspended, or discontinued with reasonable notice where practicable.
      </p>

      <h2>User accounts and responsibilities</h2>
      <ul>
        <li>You must provide accurate account information and keep credentials secure.</li>
        <li>You are responsible for all activity under your account.</li>
        <li>You must notify us promptly of unauthorized use.</li>
        <li>You are responsible for the legality and accuracy of content you submit and for obtaining any rights needed
          to use that content with the Service.</li>
      </ul>

      <h2>Acceptable use policy</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for unlawful, fraudulent, harassing, or harmful purposes.</li>
        <li>Attempt to gain unauthorized access to systems, data, or other users&apos; accounts.</li>
        <li>Reverse engineer, scrape, or overload the Service except as permitted by law.</li>
        <li>Use the Service to generate or distribute malware, spam, or deceptive content at scale in violation of law
          or third-party rights.</li>
        <li>Misrepresent AI-generated output as human where such misrepresentation is unlawful or violates platform rules
          of integrated services.</li>
      </ul>
      <p>We may suspend or terminate access for violations of this section.</p>

      <h2>Intellectual property</h2>
      <p>
        You retain ownership of content you provide (&quot;Your Content&quot;). You grant LACORE a non-exclusive,
        worldwide license to host, process, and display Your Content solely to operate, improve, and provide the
        Service, including through subprocessors and AI providers as described in our Privacy Policy.
      </p>
      <p>
        LACORE and its licensors own the Service, including software, branding, templates (excluding Your Content), and
        documentation. Except for the limited rights to use the Service under these Terms, no rights are granted to
        you.
      </p>

      <h2>Payment terms</h2>
      <p>
        Certain features may require payment. When billing is introduced or expanded, fees, billing cycles, and refund
        rules will be presented at checkout or in a separate order form. Payments may be processed by Stripe; you agree
        to Stripe&apos;s terms where applicable. Failure to pay may result in suspension of paid features. Taxes, if
        any, are your responsibility unless stated otherwise.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, the Service is provided without warranties of any kind, whether express
        or implied. LACORE is not liable for indirect, incidental, special, consequential, or punitive damages, or loss of
        profits, data, or goodwill. Our aggregate liability arising out of these Terms or the Service shall not exceed
        the greater of (a) amounts you paid to LACORE for the Service in the twelve months before the claim or (b) one
        hundred U.S. dollars (USD $100), except where liability cannot be limited by law.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the Service and request account closure by contacting us. We may suspend or terminate your
        access for breach of these Terms, risk to the Service or others, or legal requirements. Provisions that by their
        nature should survive (including ownership, limitation of liability, and governing law) will survive termination.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws applicable to LACORE&apos;s operating jurisdiction, without regard to
        conflict-of-law principles, except where mandatory consumer protections in your country apply. Courts in that
        jurisdiction shall have exclusive venue, subject to mandatory arbitration or consumer rules where required by law.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href="mailto:support@lacore.ai" style={{ color: "var(--accent)" }}>
          support@lacore.ai
        </a>
        .
      </p>
    </LegalDocShell>
  );
}
