import { CtaSection } from "@/components/cta-section";
import { Icon } from "@/components/icons";
import { MapEmbed } from "@/components/map-embed";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { neighborhoods, openingHours, site } from "@/lib/site";
import styles from "./location.module.css";

export const metadata = createPageMetadata({
  title: "موقع مركز سما سكان في حي المربع بالرياض",
  description:
    "عنوان وخريطة واتجاهات مركز سما سكان للأشعة في حي المربع بالرياض، ورقم الاتصال وواتساب لتأكيد الموعد وساعات العمل قبل الحضور.",
  path: "/location",
});

export default function LocationPage() {
  return (
    <main id="main-content">
      <PageHero
        eyebrow="Al Murabba · Riyadh"
        title="موقع مركز سما سكان في حي المربع"
        description="شاهد موقع المركز مباشرة على الخريطة التفاعلية، وتعرّف على ساعات العمل وافتح الاتجاهات إلى حي المربع قبل موعدك."
        breadcrumbs={[{ label: "الموقع والاتجاهات", href: "/location" }]}
      />

      <section className="section location-page">
        <div className="container">
          <div className="location-facts">
            <article>
              <Icon name="map" width="26" height="26" />
              <div><span>العنوان</span><b>{site.address}</b></div>
            </article>
            <article>
              <Icon name="call" width="26" height="26" />
              <div><span>الاتصال وواتساب</span><a href={site.phoneDial} data-cta="location_phone" dir="ltr">{site.phoneDisplay}</a></div>
            </article>
            <article>
              <Icon name="clock" width="26" height="26" />
              <div>
                <span>ساعات العمل</span>
                <b>{openingHours.weekdaysLabel}: {openingHours.display}</b>
                <small>{openingHours.closedDay}: مغلق</small>
              </div>
            </article>
          </div>
          <section className={styles.preview} aria-labelledby="arrival-preview-title">
            <div className="section-head">
              <span className="eyebrow">قبل الوصول إلى سما سكان</span>
              <h2 id="arrival-preview-title">تعرّف على واجهة المركز والاستقبال</h2>
              <p>صور فعلية من مركز سما سكان في حي المربع تساعدك على التعرّف على المكان قبل الزيارة.</p>
            </div>
            <div className={styles.photos}>
              <figure>
                <Image src="/center-exterior.webp" alt="واجهة مركز سما سكان ولافتته ومدخله في حي المربع بالرياض" width={1400} height={1048} sizes="(max-width: 760px) calc(100vw - 40px), 58vw" />
                <figcaption>واجهة المركز ومدخله على شارع فيصل بن تركي بن عبدالعزيز.</figcaption>
              </figure>
              <figure>
                <Image src="/reception-sama-scan-riyadh.webp" alt="منطقة الاستقبال داخل مركز سما سكان للأشعة في الرياض" width={1048} height={1400} sizes="(max-width: 760px) calc(100vw - 40px), 35vw" />
                <figcaption>منطقة الاستقبال داخل المركز.</figcaption>
              </figure>
            </div>
            <div className={styles.actions}>
              <a className="button" href={site.directions} target="_blank" rel="noopener noreferrer" data-cta="location_arrival_directions">
                <Icon name="map" width="19" height="19" /> افتح الاتجاهات إلى المركز
              </a>
              <p>أكد موعدك ونوع الفحص مع الاستقبال قبل التوجّه إلى المركز.</p>
            </div>
          </section>
          <MapEmbed />
          <div className="nearby-panel">
            <div>
              <span className="eyebrow">الوصول من الأحياء القريبة</span>
              <h2>موقع مركزي يخدم وسط الرياض</h2>
              <p>
                يقع المركز في حي المربع، ويُمكن الوصول إليه من الأحياء المحيطة
                عبر الطرق الرئيسية. استخدم الخريطة المضمنة لاستعراض الموقع
                وفتح المسار الأنسب حسب حالة المرور الحالية.
              </p>
            </div>
            <div className="keyword-pills large-pills">
              {neighborhoods.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        </div>
      </section>
      <CtaSection
        title="أكد موعدك قبل التوجه إلى المركز"
        text="اتصل أو تواصل عبر واتساب للتأكد من الفحص المطلوب والتعليمات والموعد قبل الحضور."
      />
    </main>
  );
}
import Image from "next/image";
