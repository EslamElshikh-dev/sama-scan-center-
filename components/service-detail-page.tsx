import Image from "next/image";
import Link from "next/link";
import { CtaSection } from "@/components/cta-section";
import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { blogPosts } from "@/lib/blog";
import { services, site, type Service } from "@/lib/site";

export type ServiceFaq = { question: string; answer: string };

export type ServicePageContent = {
  service: Service;
  intro: string;
  overviewTitle: string;
  overview: string[];
  commonUsesTitle: string;
  commonUsesIntro: string;
  commonUses: string[];
  patientJourney: { title: string; text: string }[];
  preparation: { title: string; text: string }[];
  qualityTitle: string;
  qualityIntro: string;
  qualityFactors: string[];
  safetyTitle: string;
  safetyText: string;
  faqs: ServiceFaq[];
  sources: { label: string; url: string }[];
};

export function ServiceDetailPage({ content }: { content: ServicePageContent }) {
  const { service } = content;
  const related = services.filter((item) => item.slug !== service.slug).slice(0, 3);
  const relatedArticles = blogPosts
    .filter((post) => post.relatedServices.includes(service.slug))
    .slice(0, 3);

  return (
    <main id="main-content">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ImagingTest",
            "@id": `${site.siteUrl}/services/${service.slug}#service`,
            name: service.shortTitle,
            alternateName: service.english,
            description: service.summary,
            url: `${site.siteUrl}/services/${service.slug}`,
            image: `${site.siteUrl}${service.image}`,
            imagingTechnique: `https://schema.org/${service.imagingTechnique}`,
            provider: { "@id": `${site.siteUrl}/#medical-center` },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: content.faqs.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        ]}
      />

      <PageHero
        eyebrow={`${service.english} · مركز سما سكان`}
        title={service.title}
        description={content.intro}
        breadcrumbs={[
          { label: "خدمات الأشعة", href: "/services" },
          { label: service.shortTitle, href: `/services/${service.slug}` },
        ]}
      />

      <section className="section service-overview">
        <div className="container article-layout">
          <article className="article-content">
            <span className="eyebrow">تعرف على الفحص</span>
            <h2>{content.overviewTitle}</h2>
            {content.overview.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <figure className="service-photo-figure">
              <Image
                src={service.image}
                alt={service.imageAlt}
                fill
                sizes="(max-width: 900px) 100vw, 58vw"
              />
              <figcaption>{service.imageCaption}</figcaption>
            </figure>
            <div className="medical-note">
              <Icon name="shield" width="24" height="24" />
              <p>
                هذه المعلومات للتوعية العامة ولا تستبدل تشخيص الطبيب أو
                تعليمات فريق الأشعة. تفاصيل الفحص والتحضير تُحدد حسب الإحالة
                والحالة الصحية.
              </p>
            </div>
          </article>

          <aside className="appointment-card">
            <span className="service-icon service-icon-large">
              <Icon name={service.icon} width="38" height="38" />
            </span>
            <p className="service-en" lang="en">{service.english}</p>
            <h2>{service.shortTitle}</h2>
            <p>{service.summary}</p>
            <a
              className="button"
              href={site.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              data-cta={`service_${service.slug}_whatsapp`}
            >
              <Icon name="whatsapp" width="20" height="20" /> استفسر عبر واتساب
            </a>
            <a
              className="appointment-call"
              href={site.phoneDial}
              data-cta={`service_${service.slug}_call`}
            >
              <Icon name="call" width="18" height="18" /> {site.phoneDisplay}
            </a>
          </aside>
        </div>
      </section>

      <section className="section patient-journey-section" aria-labelledby="journey-heading">
        <div className="container">
          <div className="section-head centered">
            <span className="eyebrow">رحلتك داخل المركز</span>
            <h2 id="journey-heading">من طلب الطبيب إلى استلام التقرير</h2>
            <p>خطوات عملية تساعد على تنظيم الموعد، مع بقاء تفاصيل الفحص مرتبطة بالإحالة والحالة الصحية.</p>
          </div>
          <div className="patient-journey-grid">
            {content.patientJourney.map((item, index) => (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section uses-section" aria-labelledby="uses-heading">
        <div className="container uses-grid">
          <div className="section-head">
            <span className="eyebrow">وفق طلب الطبيب</span>
            <h2 id="uses-heading">{content.commonUsesTitle}</h2>
            <p>{content.commonUsesIntro}</p>
          </div>
          <ul className="feature-list">
            {content.commonUses.map((item) => (
              <li key={item}>
                <span><Icon name="check" width="19" height="19" /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section service-quality-section" aria-labelledby="quality-heading">
        <div className="container uses-grid">
          <div className="section-head">
            <span className="eyebrow">صورة أدق تبدأ بتحضير صحيح</span>
            <h2 id="quality-heading">{content.qualityTitle}</h2>
            <p>{content.qualityIntro}</p>
          </div>
          <ul className="feature-list quality-list">
            {content.qualityFactors.map((item) => (
              <li key={item}>
                <span><Icon name="check" width="19" height="19" /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section preparation-section" aria-labelledby="preparation-heading">
        <div className="container">
          <div className="section-head centered">
            <span className="eyebrow">الاستعداد للموعد</span>
            <h2 id="preparation-heading">قبل زيارة مركز الأشعة</h2>
            <p>
              ابدأ بالتواصل واذكر الاسم الدقيق للفحص الموجود في الإحالة؛ فقد
              تختلف التعليمات حسب المنطقة والغرض الطبي.
            </p>
          </div>
          <div className="prep-grid">
            {content.preparation.map((item, index) => (
              <article key={item.title}>
                <span>0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <div className="safety-banner">
            <Icon name="shield" width="32" height="32" />
            <div>
              <h3>{content.safetyTitle}</h3>
              <p>{content.safetyText}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section faq-section" aria-labelledby="service-faq-heading">
        <div className="container faq-grid">
          <div className="section-head">
            <span className="eyebrow">قبل الحجز</span>
            <h2 id="service-faq-heading">أسئلة شائعة عن {service.shortTitle}</h2>
            <p>
              اتصل بالمركز للحصول على تعليمات تخص فحصك بدل الاعتماد على
              المعلومات العامة وحدها.
            </p>
          </div>
          <div className="faq-list">
            {content.faqs.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary>{item.question}<span>+</span></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section related-section" aria-labelledby="related-heading">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">خدمات مرتبطة</span>
            <h2 id="related-heading">خدمات تصوير أخرى في مركز سما سكان</h2>
          </div>
          <div className="related-grid">
            {related.map((item) => (
              <Link href={`/services/${item.slug}`} key={item.slug}>
                <span className="service-icon"><Icon name={item.icon} width="28" height="28" /></span>
                <span><b>{item.shortTitle}</b><small lang="en">{item.english}</small></span>
                <Icon name="arrow" width="20" height="20" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section service-knowledge-section" aria-labelledby="knowledge-heading">
        <div className="container">
          <div className="section-head centered">
            <span className="eyebrow">مكتبة سما سكان</span>
            <h2 id="knowledge-heading">أدلة تثقيفية مرتبطة بـ{service.shortTitle}</h2>
            <p>اقرأ عن الاستعداد والسلامة وخطوات الفحص، ثم أكد التعليمات الخاصة بحالتك مع المركز.</p>
          </div>
          <div className="related-article-grid service-article-grid">
            {relatedArticles.map((post) => (
              <article key={post.slug}>
                <span>{post.category}</span>
                <h3><Link href={`/blog/${post.slug}`}>{post.title}</Link></h3>
                <p>{post.excerpt}</p>
                <Link className="text-link" href={`/blog/${post.slug}`}>اقرأ الدليل <Icon name="arrow" width="17" height="17" /></Link>
              </article>
            ))}
          </div>
          <div className="service-sources">
            <strong>المراجع الطبية المستخدمة في صياغة الصفحة</strong>
            <ul>
              {content.sources.map((source) => (
                <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CtaSection
        title={`احجز أو استفسر عن ${service.shortTitle}`}
        text="أرسل اسم الفحص كما هو مكتوب في الطلب الطبي لتأكيد توفره وتعليمات التحضير والموعد المناسب."
      />
    </main>
  );
}
