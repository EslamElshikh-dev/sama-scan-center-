import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import type { ServicePageContent } from "@/components/service-detail-page";
import { VerifiedServiceDetails } from "@/components/verified-medical-content";
import { openingHours, services, site } from "@/lib/site";
import styles from "./mri-landing-page.module.css";

const sections = [
  { href: "#ultrasound-price", label: "السعر والموعد" },
  { href: "#ultrasound-preparation", label: "قبل الفحص" },
  { href: "#ultrasound-faq", label: "أسئلة الحجز" },
  { href: "#ultrasound-location", label: "الموقع والأوقات" },
] as const;

export function UltrasoundLandingPage({ content }: { content: ServicePageContent }) {
  const { service } = content;
  const url = `${site.siteUrl}/services/${service.slug}`;
  const booking = `/contact?service=${service.slug}#booking-form`;
  const whatsapp = `https://wa.me/${site.phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent("مرحبًا سما سكان، أرغب في معرفة سعر فحص السونار وأقرب موعد متاح. المنطقة المطلوب تصويرها: ")}`;

  return (
    <main id="main-content" className={styles.page}>
      <JsonLd data={[
        {
          "@context": "https://schema.org",
          "@type": "ImagingTest",
          "@id": `${url}#service`,
          name: service.shortTitle,
          alternateName: service.english,
          description: service.summary,
          url,
          image: `${site.siteUrl}${service.image}`,
          imagingTechnique: "https://schema.org/Ultrasound",
          provider: { "@id": `${site.siteUrl}/#medical-center` },
        },
        {
          "@context": "https://schema.org",
          "@type": "Service",
          "@id": `${url}#local-service`,
          name: service.title,
          serviceType: service.keywords,
          description: content.intro,
          url,
          provider: { "@id": `${site.siteUrl}/#medical-center` },
          areaServed: { "@type": "City", name: "الرياض" },
          subjectOf: { "@id": `${url}#service` },
          availableChannel: {
            "@type": "ServiceChannel",
            serviceUrl: `${site.siteUrl}${booking}`,
            servicePhone: {
              "@type": "ContactPoint",
              telephone: site.phoneE164,
              contactType: "appointments",
              availableLanguage: ["Arabic"],
            },
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: content.faqs.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          })),
        },
      ]} />

      <section className={styles.hero} aria-labelledby="ultrasound-title">
        <div className="container">
          <Breadcrumbs items={[
            { label: "خدمات الأشعة", href: "/services" },
            { label: service.shortTitle, href: `/services/${service.slug}` },
          ]} />
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <span className={styles.locationTag}><Icon name="map" width="17" height="17" /> سما سكان · حي المربع، الرياض</span>
              <p className={styles.eyebrow}><span lang="en" dir="ltr">Ultrasound</span> · الموجات فوق الصوتية</p>
              <h1 id="ultrasound-title">فحص سونار <span>بالرياض</span></h1>
              <p className={styles.lead}>{content.intro}</p>
              <div className={styles.heroActions}>
                <a className={`${styles.button} ${styles.callButton}`} href={site.phoneDial} data-cta="hero_ultrasound-riyadh_call">
                  <Icon name="call" width="22" height="22" /><span>اتصل لتأكيد الموعد <b dir="ltr">0559617558</b></span>
                </a>
                <a className={`${styles.button} ${styles.whatsappButton}`} href={whatsapp} target="_blank" rel="noopener noreferrer" data-cta="hero_ultrasound-riyadh_whatsapp">
                  <Icon name="whatsapp" width="23" height="23" /><span>اسأل عبر واتساب <b>السعر وأقرب موعد</b></span>
                </a>
              </div>
              <Link className={styles.formLink} href={booking} data-cta="hero_ultrasound-riyadh_booking">تفضّل إرسال طلب حجز؟ <Icon name="arrow" width="17" height="17" /></Link>
              <div className={styles.heroHours}><Icon name="clock" width="17" height="17" /><span>{openingHours.weekdaysLabel} · ٩ صباحًا – ٩ مساءً</span></div>
            </div>
            <figure className={styles.heroVisual}>
              <div className={styles.photoFrame}>
                <Image src={service.image} alt={service.imageAlt} fill preload sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1200px) 42vw, 470px" />
                <span className={styles.photoTag}><Icon name="scan" width="19" height="19" /> من داخل سما سكان</span>
              </div>
              <figcaption><span>{service.imageCaption}</span><span lang="en" dir="ltr">SAMA SCAN · Ultrasound</span></figcaption>
            </figure>
          </div>
          <nav className={styles.jumpLinks} aria-label="محتويات صفحة السونار">
            <span>ما الذي تود معرفته؟</span>
            {sections.map(({ href, label }) => <a key={href} href={href}>{label}<Icon name="arrow" width="15" height="15" /></a>)}
          </nav>
        </div>
      </section>

      <section id="ultrasound-price" className={styles.section} aria-labelledby="ultrasound-price-title">
        <div className="container">
          <div className={styles.sectionHeading}><span className={styles.eyebrow}>ابدأ بتفاصيل فحصك</span><h2 id="ultrasound-price-title">السعر والموعد، <span>بوضوح من البداية</span></h2><p>اذكر اسم الفحص والمنطقة كما وردا في طلب الطبيب ليؤكد الاستقبال التفاصيل المناسبة لك.</p></div>
          <div className={styles.bookingGrid}>
            <article className={styles.priceCard}>
              <span className={styles.cardIcon}><Icon name="scan" width="25" height="25" /></span>
              <h3>كم سعر السونار؟</h3>
              <p>يختلف السعر بحسب المنطقة ونوع السونار المطلوب. اسأل عن تكلفة فحصك وما يشمله قبل تأكيد الحجز.</p>
              <a className={styles.textLink} href={whatsapp} target="_blank" rel="noopener noreferrer" data-cta="service_ultrasound-riyadh_price_whatsapp">استفسر عن سعر فحصك <Icon name="arrow" width="17" height="17" /></a>
            </article>
            <article className={styles.bookingCard}>
              <span className={styles.cardIcon}><Icon name="clock" width="25" height="25" /></span>
              <h3>ما أقرب موعد متاح؟</h3>
              <p>تواصل مباشرة لتأكيد توفر الفحص والموعد وتعليمات التحضير. يمكنك إرسال طلب حجز، ويؤكد الاستقبال الموعد بعد مراجعته.</p>
              <Link className={styles.textLink} href={booking} data-cta="service_ultrasound-riyadh_booking">أرسل طلب حجز السونار <Icon name="arrow" width="17" height="17" /></Link>
            </article>
            <article className={styles.bookingCard}>
              <span className={styles.cardIcon}><Icon name="check" width="25" height="25" /></span>
              <h3>ماذا أجهز للتواصل؟</h3>
              <ul><li>اسم الفحص والمنطقة المطلوب تصويرها.</li><li>هل تحتاج تأكيد تعليمات الصيام أو شرب الماء؟</li><li>الوقت المناسب للتواصل وتأكيد الموعد.</li></ul>
              <a className={styles.textLink} href={site.phoneDial} data-cta="service_ultrasound-riyadh_booking_info_call">اسأل الاستقبال مباشرة <Icon name="arrow" width="17" height="17" /></a>
            </article>
          </div>
        </div>
      </section>

      <section id="ultrasound-preparation" className={`${styles.section} ${styles.preparation}`} aria-labelledby="ultrasound-preparation-title">
        <div className="container">
          <div className={styles.sectionHeading}><span className={styles.eyebrow}>قبل زيارة المركز</span><h2 id="ultrasound-preparation-title">استعد لفحصك <span>بخطوات واضحة</span></h2><p>التعليمات تختلف بحسب نوع الفحص. أكد التحضير الخاص بك مع فريق المركز عند الحجز.</p></div>
          <div className={styles.prepGrid}>{content.preparation.map((item, index) => <article key={item.title}><span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          <aside className={styles.safetyNote}><Icon name="shield" width="29" height="29" /><div><h3>{content.safetyTitle}</h3><p>{content.safetyText}</p></div></aside>
        </div>
      </section>

      <VerifiedServiceDetails slug={service.slug} />

      <section id="ultrasound-faq" className={styles.section} aria-labelledby="ultrasound-faq-title">
        <div className={`container ${styles.faqGrid}`}>
          <div className={styles.faqIntro}><span className={styles.eyebrow}>إجابات تساعدك قبل الحجز</span><h2 id="ultrasound-faq-title">سؤالك عن السونار، <span>جوابه هنا</span></h2><p>من سعر السونار إلى الصيام والتحضير واستلام التقرير. ولتفاصيل تخص فحصك، تواصل مع الاستقبال.</p><a className={`${styles.button} ${styles.callButton}`} href={site.phoneDial} data-cta="service_ultrasound-riyadh_faq_call"><Icon name="call" width="20" height="20" /> عندك سؤال آخر؟ اتصل بنا</a></div>
          <div className={styles.faqList}>{content.faqs.map(({ question, answer }, index) => <details key={question} open={index === 0}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.overview}`} aria-labelledby="ultrasound-overview-title">
        <div className={`container ${styles.overviewGrid}`}>
          <div><span className={styles.eyebrow}>تعرف على الفحص</span><h2 id="ultrasound-overview-title">{content.overviewTitle}</h2>{content.overview.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<p className={styles.medicalNote}>معلومات للتوعية العامة؛ تعليمات طبيبك وفريق الأشعة هي المرجع للتحضير والفحص.</p></div>
          <div className={styles.usesCard}><span className={styles.cardIcon}><Icon name="scan" width="27" height="27" /></span><h3>{content.commonUsesTitle}</h3><p>{content.commonUsesIntro}</p><ul>{content.commonUses.map(item => <li key={item}><Icon name="check" width="18" height="18" />{item}</li>)}</ul><p className={styles.usesNote}>يؤكد فريق المركز توفر الفحص والبروتوكول المطلوب قبل الموعد.</p></div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ultrasound-journey-title">
        <div className="container"><div className={styles.sectionHeading}><span className={styles.eyebrow}>رحلتك مع الفحص</span><h2 id="ultrasound-journey-title">من طلب الطبيب <span>إلى استلام التقرير</span></h2></div><ol className={styles.journeyGrid}>{content.patientJourney.map((item, index) => <li key={item.title}><span className={styles.journeyNumber}>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.text}</p></li>)}</ol><details className={styles.qualityDetails}><summary>{content.qualityTitle}<span aria-hidden="true">+</span></summary><p>{content.qualityIntro}</p><ul>{content.qualityFactors.map(item => <li key={item}>{item}</li>)}</ul></details></div>
      </section>

      <section id="ultrasound-location" className={`${styles.section} ${styles.locationSection}`} aria-labelledby="ultrasound-location-title">
        <div className={`container ${styles.locationGrid}`}>
          <div><span className={styles.eyebrow}>سما سكان · وسط الرياض</span><h2 id="ultrasound-location-title">موعدك في <span>حي المربع</span></h2><p>{site.address}</p><a className={`${styles.button} ${styles.outlineButton}`} href={site.directions} target="_blank" rel="noopener noreferrer" data-cta="service_ultrasound-riyadh_local_directions"><Icon name="map" width="21" height="21" /> افتح اتجاهات المركز</a></div>
          <div className={styles.hoursCard}><Icon name="clock" width="28" height="28" /><div><h3>أوقات استقبال المراجعين</h3><p><b>{openingHours.weekdaysLabel}</b><span>٩ صباحًا – ٩ مساءً</span></p><p className={styles.closedDay}>الجمعة: مغلق</p><small>تواصل لتأكيد الفحص والموعد قبل الحضور.</small></div></div>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="ultrasound-booking-title"><div className={`container ${styles.finalCtaInner}`}><div><span className={styles.eyebrow}>خطوتك التالية</span><h2 id="ultrasound-booking-title">لديك طلب سونار؟ <span>خلّنا نوضح لك التفاصيل</span></h2><p>اذكر اسم الفحص والمنطقة المطلوبة، واسأل عن السعر والموعد والتحضير في تواصل واحد.</p></div><div className={styles.finalActions}><a className={`${styles.button} ${styles.lightButton}`} href={site.phoneDial} data-cta="service_ultrasound-riyadh_call"><Icon name="call" width="21" height="21" /> اتصل بسما سكان</a><a className={`${styles.button} ${styles.whatsappButton}`} href={whatsapp} target="_blank" rel="noopener noreferrer" data-cta="service_ultrasound-riyadh_whatsapp"><Icon name="whatsapp" width="22" height="22" /> اسأل عن السعر والموعد</a><Link className={styles.formLink} href={booking} data-cta="service_ultrasound-riyadh_final_booking">أرسل طلب حجز <Icon name="arrow" width="17" height="17" /></Link></div></div></section>

      <div className={`container ${styles.moreInfo}`}><span>خدمات أخرى في سما سكان</span><div>{services.filter(item => item.slug !== service.slug).map(item => <Link key={item.slug} href={`/services/${item.slug}`}>{item.shortTitle}<Icon name="arrow" width="15" height="15" /></Link>)}</div><details><summary>المراجع الطبية للمعلومات العامة</summary><ul>{content.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul></details></div>

      <nav className={styles.mobileBar} aria-label="تواصل لحجز السونار"><a className={`${styles.button} ${styles.callButton}`} href={site.phoneDial} data-cta="service_ultrasound-riyadh_mobile_call"><Icon name="call" width="21" height="21" /><span>اتصال <small dir="ltr">0559617558</small></span></a><a className={`${styles.button} ${styles.whatsappButton}`} href={whatsapp} target="_blank" rel="noopener noreferrer" data-cta="service_ultrasound-riyadh_mobile_whatsapp"><Icon name="whatsapp" width="22" height="22" /><span>واتساب <small>السعر والموعد</small></span></a></nav>
    </main>
  );
}
