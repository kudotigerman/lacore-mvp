import type { Metadata, Viewport } from "next";
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
  title: "LACORE — Your Entire Sales Team. In One Tab.",
  description:
    "Your entire sales team in one tab. The AI sales OS for service businesses — prospects, landing pages, proposals, sequences, and payments, all in one place.",
  icons: {
    icon: "/icon",
    apple: "/apple-icon"
  },
  openGraph: {
    title: "LACORE — Your entire sales team. In one tab.",
    description: "The AI sales OS for service businesses. Find prospects, launch landing pages, close with proposals, get paid — without switching tools.",
    siteName: "LACORE",
    url: "https://www.lacore.ai",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "LACORE — Your entire sales team. In one tab."
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "LACORE — Your entire sales team. In one tab.",
    description: "The AI sales OS for service businesses. Find prospects, launch pages, close with proposals, get paid.",
    images: ["/opengraph-image"]
  },
  verification: {
    google: "5tSyzFVAJt2ONZr3Nw2YgU4nuQ2HSR1qcVE3-wWKuqw"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
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
