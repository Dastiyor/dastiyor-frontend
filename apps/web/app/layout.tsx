import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import Analytics from "@/components/Analytics";
import { verifyJWT } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n/context";
import { cookies } from "next/headers";
import { getCompany } from "@/lib/company";
import type { Locale } from "@/lib/i18n/types";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute base for file-based metadata (the generated og:image); without it Next uses the
  // deployment's own *.vercel.app address.
  metadataBase: new URL("https://www.dastiyor.com"),
  title: "Дастиёр — Маркетплейс услуг в Таджикистане",
  description: "Найдите профессионалов для любых задач. Лучший маркетплейс услуг в Таджикистане.",
  openGraph: {
    title: "Дастиёр — Маркетплейс услуг",
    description: "Найдите профессионалов для любых задач в Таджикистане.",
    url: "https://dastiyor.com",
    siteName: "Дастиёр",
    locale: "ru_TJ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Дастиёр — Маркетплейс услуг",
    description: "Найдите профессионалов для любых задач в Таджикистане.",
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
  // The session cookie is httpOnly, so the client cannot see it. Pass a plain
  // signal down instead, so the language switcher skips the account write for
  // signed-out visitors rather than firing a request that is certain to 401.
  const token = cookieStore.get("token")?.value;
  const isAuthenticated = Boolean(token);
  // Signature check only (no DB hit): good enough to tag analytics, never used for access.
  const session = token ? await verifyJWT(token) : null;
  // Read here rather than in the footer: this is a server component, so the
  // details ship with the page instead of costing a request on every load.
  const company = await getCompany();

  return (
    <html lang={locale}>
      <body className={manrope.className}>
        <I18nProvider initialLocale={locale} isAuthenticated={isAuthenticated}>
          <ClientLayoutWrapper header={<Header />} footer={<Footer company={company} />}>
            {children}
          </ClientLayoutWrapper>
          <ToastContainer />
          <Analytics
            userId={typeof session?.id === "string" ? session.id : null}
            role={typeof session?.role === "string" ? session.role : null}
          />
        </I18nProvider>
      </body>
    </html>
  );
}
