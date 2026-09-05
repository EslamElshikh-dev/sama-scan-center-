import type { Metadata } from "next";
import Image from "next/image";
import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { site } from "@/lib/site";
import styles from "./social.module.css";

const username = "@samascansenter";

const socialProfiles = [
  {
    platform: "instagram",
    labelAr: "إنستقرام",
    labelEn: "Instagram",
    note: "صور المركز والتحديثات والمحتوى التوعوي",
    href: "https://www.instagram.com/samascansenter/",
  },
  {
    platform: "tiktok",
    labelAr: "تيك توك",
    labelEn: "TikTok",
    note: "فيديوهات قصيرة ومحتوى توعوي من سما سكان",
    href: "https://www.tiktok.com/@samascansenter",
  },
  {
    platform: "snapchat",
    labelAr: "سناب شات",
    labelEn: "Snapchat",
    note: "يوميات المركز وآخر التحديثات",
    href: "https://www.snapchat.com/add/samascansenter",
  },
  {
    platform: "x",
    labelAr: "إكس",
    labelEn: "X",
    note: "أخبار المركز والتنبيهات والمستجدات",
    href: "https://x.com/samascansenter",
  },
] as const;

type Platform = (typeof socialProfiles)[number]["platform"];

function SocialIcon({ platform }: { platform: Platform }) {
  if (platform === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.1" />
        <circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (platform === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.5 3v10.2a4.35 4.35 0 1 1-3.6-4.28v3.1a1.55 1.55 0 1 0 .85 1.38V3h2.75Z" />
        <path d="M14.5 5.15c1.1 1.45 2.42 2.27 4.25 2.48v2.85c-1.68-.08-3.12-.6-4.25-1.47" />
      </svg>
    );
  }

  if (platform === "snapchat") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.1c-2.7 0-4.6 2.07-4.6 4.9v2.15c-.55.68-1.16 1.05-1.9 1.3-.48.16-.72.68-.52 1.13.28.62 1.13.9 2.03 1.18-.22.7-.68 1.55-1.55 2.22.84.43 1.67.55 2.44.58.28.02.47.14.6.4.56 1.05 1.77 1.8 3.5 1.8s2.94-.75 3.5-1.8c.13-.26.32-.38.6-.4.77-.03 1.6-.15 2.44-.58-.87-.67-1.33-1.52-1.55-2.22.9-.28 1.75-.56 2.03-1.18.2-.45-.04-.97-.52-1.13-.74-.25-1.35-.62-1.9-1.3V8c0-2.83-1.9-4.9-4.6-4.9Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4 19 20M19 4 5 20" />
    </svg>
  );
}

export const metadata: Metadata = {
  title: "روابط سما سكان الرسمية | السوشيال ميديا",
  description:
    "تابع الحسابات الرسمية لمركز سما سكان للأشعة في الرياض على إنستقرام وتيك توك وسناب شات وإكس باسم المستخدم الموحد @samascansenter.",
  alternates: { canonical: "/social" },
  openGraph: {
    title: "روابط مركز سما سكان الرسمية",
    description: `جميع حسابات سما سكان الرسمية باسم موحد ${username}`,
    url: "/social",
    images: [site.socialImage],
  },
};

const profileSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${site.siteUrl}/social#profile-page`,
  url: `${site.siteUrl}/social`,
  name: "روابط مركز سما سكان الرسمية",
  inLanguage: "ar-SA",
  mainEntity: {
    "@type": ["MedicalClinic", "DiagnosticLab"],
    "@id": `${site.siteUrl}/#medical-center`,
    name: site.nameAr,
    url: site.siteUrl,
    sameAs: [...socialProfiles.map((profile) => profile.href), site.mapsProfile],
  },
};

export default function SocialPage() {
  return (
    <main id="main-content" className={styles.page}>
      <JsonLd data={profileSchema} />
      <div className={`${styles.orb} ${styles.orbOne}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orbTwo}`} aria-hidden="true" />

      <section className={styles.shell} aria-labelledby="social-title">
        <div className={styles.brandCard}>
          <div className={styles.logoFrame}>
            <Image
              src="/sama-scan-logo.png"
              alt="شعار مركز سما سكان للأشعة"
              width={367}
              height={341}
              sizes="116px"
              priority
            />
          </div>
          <p className={styles.eyebrow}>SAMA SCAN · RADIOLOGY CENTER · RIYADH</p>
          <h1 id="social-title">مركز سما سكان للأشعة</h1>
          <p className={styles.intro}>
            تابع حساباتنا الرسمية واختَر المنصة المناسبة لك.
          </p>
          <span className={styles.handle} dir="ltr">
            {username}
          </span>
          <span className={styles.handleHint}>اسم موحّد على جميع المنصات</span>
        </div>

        <div className={styles.links} aria-label="حسابات سما سكان على السوشيال ميديا">
          {socialProfiles.map((profile) => (
            <a
              key={profile.platform}
              className={styles.socialLink}
              data-platform={profile.platform}
              href={profile.href}
              target="_blank"
              rel="noopener noreferrer"
              data-cta={`social_${profile.platform}`}
              aria-label={`فتح حساب ${profile.labelAr} الخاص بمركز سما سكان`}
            >
              <span className={styles.platformIcon}>
                <SocialIcon platform={profile.platform} />
              </span>
              <span className={styles.linkCopy}>
                <strong>{profile.labelAr}</strong>
                <span className={styles.linkMeta}>
                  <b dir="ltr">{username}</b>
                  <span aria-hidden="true">·</span>
                  <small>{profile.note}</small>
                </span>
              </span>
              <span className={styles.openIcon} aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>

        <div className={styles.quickActions} aria-label="روابط التواصل السريع">
          <a
            href={site.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.quickAction}
            data-cta="social_whatsapp"
          >
            <Icon name="whatsapp" width="22" height="22" />
            <span>
              <strong>حجز واستفسار</strong>
              <small>واتساب سما سكان</small>
            </span>
          </a>
          <a
            href={site.mapsProfile}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.quickAction}
            data-cta="social_maps"
          >
            <Icon name="map" width="22" height="22" />
            <span>
              <strong>موقع المركز</strong>
              <small>حي المربع، الرياض</small>
            </span>
          </a>
        </div>

        <p className={styles.trustLine}>
          سما سكان للأشعة والتصوير الطبي · الرياض
        </p>
      </section>
    </main>
  );
}
