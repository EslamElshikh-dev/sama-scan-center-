import type { Metadata } from "next";
import Link from "next/link";
import { CtaSection } from "@/components/cta-section";
import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { services, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "خدمات الأشعة والتصوير الطبي في الرياض",
  description:
    "خدمات مركز سما سكان في حي المربع بالرياض: الرنين المغناطيسي MRI، السونار والموجات فوق الصوتية، الدوبلر والدوبلكس، وسونار 3D و4D.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <main id="main-content">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "خدمات مركز سما سكان للأشعة",
          itemListElement: services.map((service, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${site.siteUrl}/services/${service.slug}`,
            name: service.shortTitle,
          })),
        }}
      />
      <PageHero
        eyebrow="Radiology & Medical Imaging"
        title="خدمات الأشعة والتصوير الطبي في الرياض"
        description="صفحات مستقلة وواضحة لكل خدمة متوفرة في مركز سما سكان، مع معلومات عامة عن الفحص والتحضير وطريقة الحجز في حي المربع بالرياض."
        breadcrumbs={[{ label: "خدمات الأشعة", href: "/services" }]}
      />

      <section className="section services-directory">
        <div className="container service-directory-list">
          {services.map((service, index) => (
            <article key={service.slug}>
              <div className="directory-index">0{index + 1}</div>
              <span className="service-icon service-icon-large">
                <Icon name={service.icon} width="38" height="38" />
              </span>
              <div>
                <p className="service-en" lang="en">{service.english}</p>
                <h2>{service.title}</h2>
                <p>{service.summary}</p>
                <div className="keyword-pills" aria-label="مصطلحات البحث المرتبطة">
                  {service.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
                </div>
              </div>
              <Link className="button button-secondary" href={`/services/${service.slug}`}>
                تفاصيل الخدمة <Icon name="arrow" width="18" height="18" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section entity-section">
        <div className="container article-layout">
          <article className="article-content">
            <span className="eyebrow">مركز أشعة في حي المربع</span>
            <h2>اختيار اسم الفحص الصحيح يسهّل حجز الموعد</h2>
            <p>
              قد يستخدم المرضى أكثر من اسم للفحص نفسه؛ فكلمة السونار هي الاسم
              الشائع للموجات فوق الصوتية، بينما يرتبط الدوبلر والدوبلكس بتقييم
              تدفق الدم والأوعية باستخدام تقنيات الموجات فوق الصوتية. لذلك
              جمعنا المرادفات الشائعة مع الاسم الطبي داخل كل صفحة دون تكرار
              صفحات متنافسة.
            </p>
            <p>
              عند التواصل مع مركز سما سكان، اذكر اسم الفحص كما هو مكتوب في
              إحالة الطبيب والمنطقة المطلوب تصويرها. يساعد ذلك الفريق في تأكيد
              توفر الفحص وتعليمات التحضير المناسبة قبل انتقالك إلى المركز.
            </p>
          </article>
          <aside className="appointment-card simple-card">
            <Icon name="map" width="32" height="32" />
            <h2>الموقع في وسط الرياض</h2>
            <p>{site.address}</p>
            <Link className="text-link" href="/location">
              الخريطة والاتجاهات <Icon name="arrow" width="17" height="17" />
            </Link>
          </aside>
        </div>
      </section>
      <CtaSection />
    </main>
  );
}
