import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import '../globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LoadingErrorProvider } from "@/shared/ui/loading-error-provider";
import { ErrorBoundary } from "@/shared/ui/error-boundary";
import Footer from "@/components/footer";
import { CookieConsentProvider } from "@/components/cookie-consent";
import { ExtensionPromoModal } from "@/components/extension/extension-promo-modal";
import { ContactModalProvider } from "@/shared/contact-modal-context";
import ClientI18nProvider from '@/components/client-i18n-provider';
import { AnimatedAssistant } from '@/components/animated-assistant';
import { Analytics } from '@vercel/analytics/next';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://languito.eu';
  
  return {
    metadataBase: new URL(siteUrl),
    openGraph: {
      title: 'Languito - Language Learning with AI Flashcards',
      description: 'Transform your language learning with AI-generated flashcards tailored to your specific needs.',
      url: siteUrl,
      siteName: 'Languito',
      images: [
        {
          url: '/landing.png', // Relative to metadataBase
          width: 1200,
          height: 630,
          alt: 'Languito - AI-powered language learning platform',
          type: 'image/png',
        },
      ],
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Languito - Language Learning with AI Flashcards',
      description: 'Transform your language learning with AI-generated flashcards tailored to your specific needs.',
      images: ['/landing.png'], // Relative to metadataBase
    },
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await the params to get the locale
  const { locale } = await params;
  
  // Ensure that the incoming `locale` is valid
  if (!hasLocale(locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Load messages
  let messages;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    messages = (await import(`../../../messages/en.json`)).default;
  }

  return (
    <html lang={locale}>

      <body className="relative isolate overflow-x-hidden">
        <ErrorBoundary>
          <LoadingErrorProvider>
            <ClientI18nProvider messages={messages}>
              <CookieConsentProvider>
                <ContactModalProvider>
                  {children}
                  <Footer />
                  <AnimatedAssistant />
                  <ExtensionPromoModal />
                </ContactModalProvider>
              </CookieConsentProvider>
            </ClientI18nProvider>
          </LoadingErrorProvider>
        </ErrorBoundary>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
} 