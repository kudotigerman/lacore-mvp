import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { PaddleProvider } from "@/components/PaddleProvider";

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('lacore-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lacore.ai"),
  title: "LACORE — Your AI Sales Machine",
  description:
    "From offer to first client in 60 minutes. AI-powered sales system for freelancers and consultants.",
  icons: {
    icon: "/icon",
    apple: "/apple-icon"
  },
  openGraph: {
    title: "LACORE — Your AI Sales Machine",
    description: "From offer to first client in 60 minutes.",
    siteName: "LACORE"
  },
  verification: {
    google: "5tSyzFVAJt2ONZr3Nw2YgU4nuQ2HSR1qcVE3-wWKuqw"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <PaddleProvider />
        {children}
      </body>
    </html>
  );
}
