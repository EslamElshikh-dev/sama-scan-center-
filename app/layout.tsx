import type { Metadata, Viewport } from "next";
import { ClickTracker } from "@/components/click-tracker";
import { FloatingActions } from "@/components/floating-actions";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { JsonLd } from "@/components/json-ld";
import { services, site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.siteUrl),
  title: {
    default: "مركز سما سكان للأشعة في الرياض | حي المربع",
    template: "%s | مركز سما سكان",
  },
  description: site.description,
  applicationName: site.nameAr,
  authors: [{ name: site.nameAr, url: site.siteUrl }],
  creator: site.nameAr,
  publisher: site.nameAr,
  category: "healthcare",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  keywords: [
    "مركز أشعة بالرياض",
    "مركز أشعة المربع",
    "رنين مغناطيسي الرياض",
    "سونار الرياض",
    "موجات فوق صوتية الرياض",
    "أشعة دوبلر الرياض",
    "دوبلكس الرياض",
    "سونار ثلاثي الأبعاد الرياض",
    "سونار رباعي الأبعاد الرياض",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: site.siteUrl,
    siteName: site.nameAr,
    title: "مركز سما سكان للأشعة في الرياض",
    description: site.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "مركز سما سكان للأشعة والتصوير الطبي في الرياض",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "مركز سما سكان للأشعة في الرياض",
    description: site.description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5fbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#071b2e" },
  ],
  colorScheme: "light",
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${site.siteUrl}/#website`,
      url: site.siteUrl,
      name: site.nameAr,
      alternateName: site.nameEn,
      inLanguage: "ar-SA",
      publisher: { "@id": `${site.siteUrl}/#medical-center` },
    },
    {
      "@type": ["MedicalClinic", "LocalBusiness"],
      "@id": `${site.siteUrl}/#medical-center`,
      name: site.nameAr,
      alternateName: site.nameEn,
      url: site.siteUrl,
      telephone: site.phoneE164,
      description: site.description,
      medicalSpecialty: "Radiology",
      currenciesAccepted: "SAR",
      paymentAccepted: "Cash, Credit Card, NFC",
      address: {
        "@type": "PostalAddress",
        streetAddress: "4479 شارع فيصل بن تركي بن عبدالعزيز، حي المربع",
        addressLocality: "الرياض",
        addressRegion: "منطقة الرياض",
        postalCode: "12584",
        addressCountry: "SA",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: site.latitude,
        longitude: site.longitude,
      },
      hasMap: site.mapsProfile,
      sameAs: [site.mapsProfile],
      areaServed: {
        "@type": "City",
        name: "الرياض",
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: site.phoneE164,
        contactType: "appointments",
        availableLanguage: ["Arabic"],
      },
      availableService: services.map((service) => ({
        "@type": "MedicalProcedure",
        name: service.shortTitle,
        alternateName: service.english,
        url: `${site.siteUrl}/services/${service.slug}`,
        procedureType: "Diagnostic",
      })),
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <JsonLd data={localBusinessSchema} />
        <Header />
        {children}
        <Footer />
        <FloatingActions />
        <ClickTracker />
      </body>
    </html>
  );
}
