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
    default: site.pageTitle,
    template: `%s | ${site.nameAr}`,
  },
  description: site.description,
  applicationName: site.nameAr,
  authors: [{ name: site.nameAr, url: site.siteUrl }],
  creator: site.nameAr,
  publisher: site.nameAr,
  category: "healthcare",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/sama-scan-icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/sama-scan-icon.png",
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
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
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: site.nameAr,
    title: site.pageTitle,
    description: site.description,
    images: [
      {
        url: site.socialImage,
        width: 1200,
        height: 630,
        alt: "مركز سما سكان للأشعة والتصوير الطبي في الرياض",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.pageTitle,
    description: site.description,
    images: [site.socialImage],
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
  verification: {
    google: "qNw9Z7TgmnJGswXKDRmfMOfDrXNPDJdHMNeJVSq-T3w",
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

const imagingTests = services.map((service) => ({
  "@type": "ImagingTest",
  "@id": `${site.siteUrl}/services/${service.slug}#service`,
  name: service.shortTitle,
  alternateName: service.english,
  description: service.summary,
  url: `${site.siteUrl}/services/${service.slug}`,
  imagingTechnique: `https://schema.org/${service.imagingTechnique}`,
  provider: { "@id": `${site.siteUrl}/#medical-center` },
}));

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
      creator: {
        "@type": "Person",
        "@id": "https://www.eslam-elshikh.com/#person",
        name: "إسلام الشيخ",
        alternateName: [
          "المهندس إسلام الشيخ",
          "المهندس اسلام الشيخ",
          "اسلام الشيخ",
          "إسلام الشيخ | Eslam Elshikh",
          "Eslam Elshikh",
          "Islam Elshikh",
          "Eslam El Sheikh",
        ],
        url: "https://www.eslam-elshikh.com/",
      },
    },
    {
      "@type": ["MedicalClinic", "DiagnosticLab", "LocalBusiness"],
      "@id": `${site.siteUrl}/#medical-center`,
      name: site.nameAr,
      alternateName: site.nameEn,
      url: site.siteUrl,
      telephone: site.phoneE164,
      description: site.description,
      image: `${site.siteUrl}${site.socialImage}`,
      logo: `${site.siteUrl}/sama-scan-icon.png`,
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
      availableService: imagingTests.map((test) => ({ "@id": test["@id"] })),
      availableTest: imagingTests.map((test) => ({ "@id": test["@id"] })),
    },
    ...imagingTests,
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
