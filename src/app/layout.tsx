import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getThemePreference } from "@/lib/theme.server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BusinessPuls",
  description: "Administrare simplă a afacerii pentru PFA, II, IF și SRL-uri din România.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getThemePreference();

  return (
    <html
      lang="en"
      data-theme={theme ?? undefined}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface text-text">{children}</body>
    </html>
  );
}
