import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { findVerifiedReview, formatContentDate } from "@/lib/medical-review";
import { getVerifiedContent } from "@/lib/verified-content";
import { site, type Service } from "@/lib/site";
import styles from "./service-support.module.css";

export async function ServiceEditorialNote({ service }: { service: Service }) {
  const verified = findVerifiedReview(await getVerifiedContent(), `review-service-${service.slug}`, service.modified);
  return <section className={styles.editorial} aria-label="مصدر معلومات الفحص">
    <div className={`container ${styles.editorialInner}`}>
      <div><span className="eyebrow">عن هذه المعلومات</span><p>الناشر: <Link href="/about">{site.nameAr}</Link></p>
        <p>آخر تحديث: <time dateTime={service.modified}>{formatContentDate(service.modified)}</time></p>
        {["mri-riyadh", "ultrasound-riyadh"].includes(service.slug) && <p><Link href={`/en/services/${service.slug}`} lang="en" dir="ltr">Read in English →</Link></p>}
      </div>
      {verified ? <div><p>مراجعة طبية: <Link href={`/about#clinician-${verified.clinician.id}`}>{verified.clinician.data.name}</Link> · {verified.clinician.data.specialty}</p>
        <p>تاريخ المراجعة: <time dateTime={verified.review.data.reviewedAt}>{formatContentDate(verified.review.data.reviewedAt)}</time></p>
        <JsonLd data={{ "@context": "https://schema.org", "@type": "MedicalWebPage", "@id": `${site.siteUrl}/services/${service.slug}#webpage`,
          url: `${site.siteUrl}/services/${service.slug}`, dateModified: service.modified, lastReviewed: verified.review.data.reviewedAt,
          reviewedBy: { "@type": "Person", name: verified.clinician.data.name, jobTitle: verified.clinician.data.specialty,
            url: `${site.siteUrl}/about#clinician-${verified.clinician.id}` } }} />
      </div> : <p className={styles.editorialDescription}>معلومات تثقيفية تساعدك على تجهيز أسئلتك قبل الموعد. تعليمات الطبيب وفريق المركز هي المرجع لفحصك. <Link href="/about#editorial-heading">سياسة المحتوى الطبي</Link></p>}
    </div>
  </section>;
}
