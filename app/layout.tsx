import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import { I18nProvider } from "@/lib/i18n/context";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dastiyor - Service Marketplace",
  description: "Find skilled professionals for your tasks in Tajikistan. The best marketplace for services.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={manrope.className}>
        <I18nProvider>
          <ClientLayoutWrapper header={<Header />} footer={<Footer />}>
            {children}
          </ClientLayoutWrapper>
          <ToastContainer />
        </I18nProvider>
      </body>
    </html>
  );
}
