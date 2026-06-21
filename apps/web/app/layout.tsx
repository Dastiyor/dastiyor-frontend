import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import { I18nProvider } from "@/lib/i18n/context";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n/types";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Дастиёр — Маркетплейс услуг в Таджикистане",
  description: "Найдите профессионалов для любых задач. Лучший маркетплейс услуг в Таджикистане.",
  openGraph: {
    title: "Дастиёр — Маркетплейс услуг",
    description: "Найдите профессионалов для любых задач в Таджикистане.",
    url: "https://dastiyor.com",
    siteName: "Дастиёр",
    locale: "ru_TJ",
    type: "website",
    images: [{ url: "https://dastiyor.com/opengraph-image.png", width: 1200, height: 630, alt: "Дастиёр" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Дастиёр — Маркетплейс услуг",
    description: "Найдите профессионалов для любых задач в Таджикистане.",
    images: ["https://dastiyor.com/opengraph-image.png"],
  },
  alternates: {
    canonical: "https://dastiyor.com",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("dastiyor_locale")?.value;
  const locale: Locale = raw === "ru" || raw === "tj" ? raw : "ru";

  return (
    <html lang={locale}>
      <body className={manrope.className}>
        <I18nProvider initialLocale={locale}>
          <ClientLayoutWrapper header={<Header />} footer={<Footer />}>
            {children}
          </ClientLayoutWrapper>
          <ToastContainer />
        </I18nProvider>
      </body>
    </html>
  );
}
