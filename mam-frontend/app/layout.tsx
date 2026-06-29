import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { HtmlLangDir } from "@/components/shared/HtmlLangDir";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MAM — Agency OS",
  description: "Marketing & Media Manager — Internal Agency Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${cairo.variable} antialiased`}>
        <Providers>
          <HtmlLangDir />
          {children}
        </Providers>
      </body>
    </html>
  );
}
