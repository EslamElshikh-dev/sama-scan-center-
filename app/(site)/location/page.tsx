import { CtaSection } from "@/components/cta-section";
import { Icon } from "@/components/icons";
import { MapEmbed } from "@/components/map-embed";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { neighborhoods, openingHours, site } from "@/lib/site";

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
              <div><span>الاتصال وواتساب</span><a href={site.phoneDial} dir="ltr">{site.phoneDisplay}</a></div>
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
