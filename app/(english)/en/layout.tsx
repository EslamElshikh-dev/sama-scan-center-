import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { ClickTracker } from "@/components/click-tracker";
import { EslamDeveloperSignature } from "@/components/eslam-developer-credit";
import { FloatingActions } from "@/components/floating-actions";
import { GoogleAnalytics } from "@/components/google-analytics";
import { site } from "@/lib/site";
import "../../globals.css";
import styles from "./english.module.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.siteUrl), applicationName: site.nameEn,
  robots: { index: true, follow: true }, icons: { icon: "/sama-scan-icon.png", apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f3f9ff" };

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-SA" dir="ltr"><body className={styles.body}>
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <header className={styles.header}><div className={`container ${styles.headerInner}`}>
      <Link href="/" className={styles.brand}><Image src="/sama-scan-icon.png" width={46} height={46} alt="" /><span>Sama Scan<small>Radiology Center · Riyadh</small></span></Link>
      <nav aria-label="Main navigation"><Link href="/en/services/mri-riyadh">MRI</Link><Link href="/en/services/ultrasound-riyadh">Ultrasound</Link><Link href="/services" lang="ar-SA" dir="rtl">العربية</Link></nav>
      <a className={styles.callLink} href={site.phoneDial} data-cta="english_header_call">Call reception</a>
    </div></header>
    {children}
    <footer className={styles.footer}><div className="container"><div className={styles.footerInfo}><div><strong>Sama Scan Radiology Center</strong><p>4479 Faisal bin Turki bin Abdulaziz Street, Al Murabba, Riyadh 12584.</p></div><div><a href={site.phoneDial} data-cta="english_footer_call">{site.phoneDisplay}</a><p>Saturday–Thursday: 9 am–9 pm<br />Friday: closed</p></div></div>
      <div className={styles.footerBottom}><span>© 2026 Sama Scan. All rights reserved.</span><EslamDeveloperSignature english /></div>
    </div></footer>
    <FloatingActions english /><ClickTracker /><GoogleAnalytics />
  </body></html>;
}
