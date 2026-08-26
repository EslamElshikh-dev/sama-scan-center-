import Image from "next/image";
import Link from "next/link";
import { CtaSection } from "@/components/cta-section";
import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { MapEmbed } from "@/components/map-embed";
import { createPageMetadata } from "@/lib/metadata";
import { neighborhoods, services, site } from "@/lib/site";

export const metadata = createPageMetadata({
  title: site.pageTitle,
  description: site.description,
  path: "/",
  absoluteTitle: true,
});

const faqs = [
  {
    question: "ما خدمات الأشعة المتوفرة في مركز سما سكان؟",
    answer:
      "يوفر المركز الرنين المغناطيسي MRI، السونار والموجات فوق الصوتية، فحوصات الدوبلر والدوبلكس، والتصوير بالموجات فوق الصوتية ثلاثي ورباعي الأبعاد. يُنصح بالتواصل قبل الحضور لتأكيد نوع الفحص المطلوب.",
  },
  {
    question: "أين يقع مركز سما سكان في الرياض؟",
    answer:
      "يقع مركز سما سكان في حي المربع، على شارع فيصل بن تركي بن عبدالعزيز، الرياض 12584. يمكنك فتح الاتجاهات المباشرة من صفحة الموقع.",
  },
  {
    question: "كيف أحجز موعدًا أو أتأكد من تعليمات الفحص؟",
    answer:
      "يمكنك الاتصال على الرقم +966 55 961 7558 أو التواصل عبر واتساب بالرقم نفسه. اذكر اسم الفحص المكتوب في الطلب الطبي لتأكيد الموعد وتعليمات التحضير.",
  },
  {
    question: "هل تحتاج فحوصات الأشعة إلى تحضير مسبق؟",
    answer:
      "تختلف التعليمات حسب نوع الفحص والمنطقة المطلوب تصويرها واحتمال استخدام مادة تباين. تواصل مع المركز قبل الموعد واتبع تعليمات الطبيب أو فريق الأشعة.",
  },
  {
    question: "هل يمكن زيارة المركز دون إرسال بيانات طبية عبر الموقع؟",
    answer:
      "نعم. الموقع لا يطلب رفع تقارير أو بيانات صحية. استخدم الاتصال أو واتساب للاستفسار عن نوع الفحص والموعد، وتجنب إرسال بيانات طبية حساسة غير ضرورية.",
  },
];

export default function HomePage() {
  return (
    <main id="main-content">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }}
      />

      <section className="hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy reveal">
            <div className="location-pill">
              <span /> مركز أشعة وتصوير طبي في حي المربع · الرياض
            </div>
            <h1>
              <span className="hero-title-brand">
                مركز سما سكان للأشعة والتصوير الطبي في الرياض
              </span>
              <span className="hero-title-slogan">
                صورة أوضح. خطوة أدق نحو التشخيص.
              </span>
            </h1>
            <p className="hero-lead">
              في <strong>مركز سما سكان</strong> نسهّل عليك الوصول إلى خدمات
              التصوير الطبي، من الرنين المغناطيسي إلى السونار والدوبلر، مع
              تواصل مباشر لتأكيد الفحص وتعليمات التحضير قبل زيارتك.
            </p>
            <div className="button-row hero-actions">
              <a
                className="button button-accent"
                href={site.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                data-cta="hero_whatsapp"
              >
                <Icon name="whatsapp" width="21" height="21" /> احجز عبر واتساب
              </a>
              <a
                className="button button-ghost-dark"
                href={site.phoneDial}
                data-cta="hero_call"
              >
                <Icon name="call" width="20" height="20" />
                <span dir="ltr">{site.phoneDisplay}</span>
              </a>
            </div>
            <ul className="hero-points" aria-label="مميزات التواصل والزيارة">
              <li>
                <Icon name="check" /> تأكيد نوع الفحص قبل الحضور
              </li>
              <li>
                <Icon name="check" /> موقع مركزي في حي المربع
              </li>
              <li>
                <Icon name="check" /> اتصال وواتساب على رقم واحد
              </li>
            </ul>
          </div>

          <div className="hero-visual reveal reveal-delay" aria-label="رسم تجريدي للتصوير الطبي">
            <div className="visual-glow" />
            <div className="scan-console">
              <div className="console-top">
                <span className="console-status"><i /> SCAN READY</span>
                <span>RIYADH · 24.6633°N</span>
              </div>
              <div className="scan-window">
                <div className="scan-orbit orbit-one" />
                <div className="scan-orbit orbit-two" />
                <div className="scan-core">
                  <Image
                    className="scan-core-logo"
                    src="/sama-scan-icon.png"
                    alt=""
                    width={512}
                    height={512}
                    sizes="118px"
                    priority
                  />
                </div>
                <div className="scan-line" />
              </div>
              <div className="console-bottom">
                <div>
                  <small>LOCATION</small>
                  <strong>AL MURABBA</strong>
                </div>
                <div>
                  <small>CENTER</small>
                  <strong>SAMA SCAN</strong>
                </div>
                <span className="signal" aria-hidden="true"><i /><i /><i /><i /></span>
              </div>
            </div>
            <div className="visual-card visual-card-one">
              <Icon name="shield" width="22" height="22" />
              <span><small>قبل الفحص</small><b>تعليمات واضحة</b></span>
            </div>
            <div className="visual-card visual-card-two">
              <Icon name="map" width="22" height="22" />
              <span><small>الرياض</small><b>حي المربع</b></span>
            </div>
          </div>
        </div>
        <div className="container trust-strip" aria-label="معلومات المركز">
          <div><b>4</b><span>مجموعات خدمات تصوير مؤكدة</span></div>
          <div><b>مباشر</b><span>حجز واستفسار عبر واتساب</span></div>
          <div><b>مركزي</b><span>موقع في قلب مدينة الرياض</span></div>
          <div><b>مرن</b><span>الاتصال لتأكيد الفحص والموعد</span></div>
        </div>
      </section>

      <section className="section services-section" aria-labelledby="services-heading">
        <div className="container">
          <div className="section-head centered reveal">
            <span className="eyebrow">خدمات تصوير طبي مستقلة</span>
            <h2 id="services-heading">خدمات مركز سما سكان للأشعة بالرياض</h2>
            <p>
              اختر الخدمة المطلوبة لمعرفة فكرة الفحص والتحضير العام، ثم تواصل
              معنا لتأكيد التفاصيل وفق طلب الطبيب والحالة.
            </p>
          </div>
          <div className="service-grid">
            {services.map((service, index) => (
              <article className="service-card reveal" key={service.slug}>
                <div className="service-card-top">
                  <span className="service-number">0{index + 1}</span>
                  <span className="service-icon">
                    <Icon name={service.icon} width="32" height="32" />
                  </span>
                </div>
                <p className="service-en" lang="en">{service.english}</p>
                <h3>{service.shortTitle}</h3>
                <p>{service.summary}</p>
                <Link className="card-link" href={`/services/${service.slug}`}>
                  تفاصيل الفحص <Icon name="arrow" width="18" height="18" />
                </Link>
              </article>
            ))}
          </div>
          <div className="section-action">
            <Link className="button button-secondary" href="/services">
              استعرض جميع خدمات الأشعة <Icon name="arrow" width="18" height="18" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section split-section" aria-labelledby="before-visit-heading">
        <div className="container split-grid">
          <div className="content-panel reveal">
            <span className="eyebrow">قبل زيارتك</span>
            <h2 id="before-visit-heading">ثلاث خطوات تقلّل الانتظار وتوضح المطلوب</h2>
            <p>
              تختلف متطلبات التصوير الطبي من فحص لآخر. مشاركة اسم الفحص المكتوب
              في الإحالة عند الحجز تساعد على إعطائك التعليمات المناسبة.
            </p>
            <ol className="steps-list">
              <li><span>1</span><div><b>تواصل مع المركز</b><p>اتصل أو أرسل اسم الفحص عبر واتساب.</p></div></li>
              <li><span>2</span><div><b>أكد التعليمات</b><p>اسأل عن الصيام، التقارير السابقة وأي تحضير مطلوب.</p></div></li>
              <li><span>3</span><div><b>احضر في الموعد</b><p>اصطحب الهوية والإحالة وأي صور أو تقارير مرتبطة عند الحاجة.</p></div></li>
            </ol>
          </div>
          <aside className="safety-panel reveal reveal-delay">
            <div className="safety-icon"><Icon name="shield" width="36" height="36" /></div>
            <span className="eyebrow eyebrow-light">سلامتك أولًا</span>
            <h2>معلومة مهمة قبل الرنين المغناطيسي</h2>
            <p>
              أخبر فريق الأشعة مسبقًا عن منظم ضربات القلب، أي زرعات أو قطع
              معدنية، العمليات السابقة، الحمل أو احتمال وجوده، والحساسية أو
              أمراض الكلى إذا كان الفحص قد يتطلب مادة تباين.
            </p>
            <Link className="text-link text-link-light" href="/services/mri-riyadh">
              دليل الرنين المغناطيسي <Icon name="arrow" width="17" height="17" />
            </Link>
          </aside>
        </div>
      </section>

      <section className="section location-preview" aria-labelledby="location-heading">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">قريب من وسط الرياض</span>
            <h2 id="location-heading">الوصول إلى مركز سما سكان في حي المربع</h2>
            <p>
              موقع مناسب للقادمين من {neighborhoods.slice(1, 6).join("، ")}،
              وبقية أحياء الرياض عبر الطرق الرئيسية المحيطة بوسط المدينة.
            </p>
          </div>
          <MapEmbed />
        </div>
      </section>

      <section className="section faq-section" aria-labelledby="faq-heading">
        <div className="container faq-grid">
          <div className="section-head reveal">
            <span className="eyebrow">أسئلة شائعة</span>
            <h2 id="faq-heading">إجابات سريعة قبل حجز الأشعة</h2>
            <p>
              معلومات عامة تساعدك على الاستعداد. تعليمات الطبيب وفريق المركز
              هي المرجع النهائي لكل حالة.
            </p>
            <Link className="button button-secondary" href="/contact">
              اسأل عن فحصك
            </Link>
          </div>
          <div className="faq-list">
            {faqs.map((item, index) => (
              <details key={item.question} open={index === 0}>
                <summary>{item.question}<span>+</span></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </main>
  );
}
