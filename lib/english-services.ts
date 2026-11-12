import type { Metadata } from "next";
import { site } from "./site";

export const englishServices = [
  {
    slug: "mri-riyadh", label: "MRI", title: "MRI scans in Riyadh",
    description: "MRI at Sama Scan Radiology Center in Al Murabba, Riyadh. Contact reception to confirm your requested examination, price, preparation and appointment.",
    intro: "Arrange the MRI examination requested by your doctor at our center in Al Murabba. Tell reception the examination name and body area so they can confirm availability, the price and your preparation instructions.",
    exams: "Brain, spine and joint MRI are among the center’s services. Confirm the exact examination and protocol with reception before your visit.",
    guide: "https://www.radiologyinfo.org/en/info/mri",
  },
  {
    slug: "ultrasound-riyadh", label: "Ultrasound", title: "Ultrasound scans in Riyadh",
    description: "Ultrasound at Sama Scan Radiology Center in Al Murabba, Riyadh. Ask about your examination, preparation, price and appointment before visiting.",
    intro: "Have an ultrasound request from your doctor? Contact Sama Scan in Al Murabba with the exact examination name and body area to confirm the price, availability and preparation for your visit.",
    exams: "The center provides ultrasound, Doppler and duplex, and 3D/4D ultrasound. These are different examination requests; reception will confirm the service named by your doctor.",
    guide: "https://www.radiologyinfo.org/en/info/genus",
  },
] as const;

export type EnglishService = (typeof englishServices)[number];

export function englishServiceMetadata(content: EnglishService): Metadata {
  const url = `${site.siteUrl}/en/services/${content.slug}`;
  const arabicUrl = `${site.siteUrl}/services/${content.slug}`;
  const title = `${content.title} | Sama Scan, Al Murabba`;
  return {
    title: { absolute: title }, description: content.description,
    alternates: { canonical: url, languages: { "ar-SA": arabicUrl, "en-SA": url, "x-default": arabicUrl } },
    openGraph: { type: "website", locale: "en_SA", url, siteName: site.nameEn, title, description: content.description,
      images: [{ url: `${site.siteUrl}${site.socialImage}`, width: 1200, height: 630, alt: "Sama Scan Radiology Center in Riyadh" }] },
    twitter: { card: "summary_large_image", title, description: content.description, images: [`${site.siteUrl}${site.socialImage}`] },
  };
}
