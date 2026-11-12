import type { Metadata } from "next";
import { site } from "@/lib/site";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  absoluteTitle?: boolean;
  languageAlternates?: Record<string, string>;
};

function absoluteUrl(path: string) {
  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${site.siteUrl}${normalizedPath}`;
}

export function createPageMetadata({
  title,
  description,
  path,
  keywords,
  absoluteTitle = false,
  languageAlternates,
}: PageMetadataOptions): Metadata {
  const url = absoluteUrl(path);
  const socialTitle = absoluteTitle ? title : `${title} | ${site.nameAr}`;
  const socialImage = `${site.siteUrl}${site.socialImage}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: { canonical: url, ...(languageAlternates ? { languages: languageAlternates } : {}) },
    openGraph: {
      type: "website",
      locale: "ar_SA",
      url,
      siteName: site.nameAr,
      title: socialTitle,
      description,
      images: [
        {
          url: socialImage,
          secureUrl: socialImage,
          type: "image/png",
          width: 1200,
          height: 630,
          alt: "مركز سما سكان للأشعة والتصوير الطبي في الرياض",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [socialImage],
    },
  };
}
