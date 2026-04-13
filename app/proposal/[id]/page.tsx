import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import { fetchPublicProposalById, siteBaseUrl } from "@/lib/proposals/fetchPublicProposal";
import { ProposalAcceptButton } from "./ProposalAcceptButton";
import { ProposalSignatureCard } from "./ProposalSignatureCard";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap"
});

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await fetchPublicProposalById(params.id);
  const base = siteBaseUrl();
  if (!data) {
    return {
      title: "Proposal | LACORE",
      robots: { index: false, follow: false }
    };
  }
  const title = `Proposal for ${data.client_name} | LACORE`;
  const desc =
    data.client_problem.length > 155
      ? `${data.client_problem.slice(0, 155)}…`
      : data.client_problem;
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "article",
      url: `${base}/proposal/${data.id}`,
      siteName: "LACORE"
    },
    twitter: {
      card: "summary",
      title,
      description: desc
    }
  };
}

export default async function PublicProposalPage({ params }: Props) {
  const data = await fetchPublicProposalById(params.id);
  if (!data) notFound();

  const dateStr = new Date(data.created_at).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  const sender = data.senderDisplayName?.trim() || "Proposal author";

  return (
    <div
      className={`${jakarta.className} min-h-screen bg-white text-slate-900 antialiased print:bg-white print:text-black`}
    >
      <header className="border-b border-slate-100 bg-white print:border-slate-200">
        <div className="mx-auto w-full max-w-[600px] px-4 pb-10 pt-10 sm:pt-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-600">Proposal</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {data.client_name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{dateStr}</p>

          <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Prepared by</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{sender}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This proposal was prepared for <span className="font-medium text-slate-800">{data.client_name}</span>
              {data.client_problem ? (
                <>
                  {" "}
                  regarding: <span className="italic text-slate-700">&ldquo;{data.client_problem}&rdquo;</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[600px] px-4 py-10 sm:py-14">
        <div className="space-y-10 sm:space-y-12">
          {data.sections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8 print:border-slate-200 print:shadow-none"
            >
              <h2 className="text-lg font-bold tracking-tight text-indigo-600 sm:text-xl">{section.title}</h2>
              <p className="mt-4 whitespace-pre-wrap text-base leading-[1.75] text-slate-700 sm:text-[17px]">
                {section.content}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 space-y-4 border-t border-slate-100 pt-8 print:hidden">
          <ProposalSignatureCard
            proposalId={data.id}
            initialSignedAt={data.signed_at}
            initialSignedByName={data.signed_by_name}
          />
          <ProposalAcceptButton />
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-100 bg-slate-50/50 py-8 print:bg-white">
        <div className="mx-auto w-full max-w-[600px] px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500/90">Powered by LACORE</p>
          <p className="mt-2 text-xs text-slate-400">
            Professional proposals for freelancers and consultants ·{" "}
            <a href="https://www.lacore.ai" className="text-indigo-600 underline-offset-2 hover:underline">
              lacore.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
