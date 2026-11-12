import Image from "next/image";
import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";
import styles from "./review.module.css";

export const metadata = {
  ...createPageMetadata({ title: "شارك تجربتك مع سما سكان", description: "دعوة اختيارية لمراجعي مركز سما سكان لمشاركة تجربتهم الصادقة على Google.", path: "/review" }),
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

export default function ReviewPage() {
  return <main id="main-content" className={styles.page}><section className={`container ${styles.card}`}>
    <div className={styles.copy}><span className="eyebrow">شكرًا لزيارتك سما سكان</span><h1>تجربتك تهمّنا.<br /><span>شاركها بكلماتك.</span></h1>
      <p>إذا سبق أن زرت المركز، يسعدنا رأيك الصادق في الاستقبال والحجز والخدمة. تجربتك، سواء كانت إيجابية أو فيها ملاحظات، تساعدنا على التحسين.</p>
      <a className="button" href={site.reviewUrl} target="_blank" rel="noopener noreferrer" data-cta="review_google_experience">شارك تجربتك على Google ←</a>
      <p className={styles.note}>المشاركة اختيارية. اختر التقييم الذي يعبّر عن تجربتك، وتجنّب نشر معلومات طبية أو تفاصيل شخصية.</p>
      <div className={styles.links}><a href={site.phoneDial}>تواصل مع الاستقبال</a><Link href="/">العودة إلى موقع المركز</Link></div>
    </div>
    <figure className={styles.qr}><Image src="/sama-scan-review-qr.svg" width={250} height={250} unoptimized alt="رمز QR لفتح صفحة تقييم سما سكان على Google" /><figcaption>افتح كاميرا الجوال وامسح الرمز</figcaption><a href="/sama-scan-review-card.pdf" target="_blank" rel="noreferrer">بطاقة الدعوة للطباعة</a></figure>
  </section></main>;
}
