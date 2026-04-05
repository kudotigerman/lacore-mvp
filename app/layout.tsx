import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

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
  title: "LACORE",
  description: "You say what you sell. LACORE does the rest.",
  icons: {
    icon: "/favicon.svg"
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
      <body>{children}</body>
    </html>
  );
}
