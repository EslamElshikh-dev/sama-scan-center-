import Image from "next/image";
import Link from "next/link";
import { CtaSection } from "@/components/cta-section";
import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { LocationContactForm } from "@/components/location-contact-form";
import { MapEmbed } from "@/components/map-embed";
import { createPageMetadata } from "@/lib/metadata";
import { neighborhoods, site } from "@/lib/site";

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

const premiumServices = [
  {
    slug: "mri-riyadh",
    english: "Advanced MRI Unit",
    title: "وحدة الرنين المغناطيسي",
    subtitle: "رؤية تشريحية دقيقة.. وتجربة أكثر هدوءًا.",
    description:
      "تجربة تصوير بالرنين المغناطيسي صُممت لتجمع بين الدقة والراحة. نستخدم تقنيات تصوير متقدمة تساعد على إظهار التفاصيل التشريحية والأنسجة بوضوح عالٍ، بما يدعم الطبيب في تقييم الجهاز العصبي والعضلي ومناطق متعددة من الجسم، دون استخدام الأشعة المؤينة.",
    icon: "scan" as const,
  },
  {
    slug: "ultrasound-riyadh",
    english: "High-Frequency Ultrasound",
    title: "وحدة الموجات فوق الصوتية",
    subtitle: "تفاصيل حية تساعد على فهم الصورة الطبية بوضوح أكبر.",
    description:
      "فحوصات سونار عالية الدقة تتيح تقييم الأعضاء والأنسجة في الزمن الفعلي بصورة آمنة ولطيفة. تساعد الموجات فوق الصوتية الطبيب في تقييم مجموعة واسعة من الحالات وفق نوع الإحالة والمنطقة المطلوب فحصها، مع اهتمام واضح بجودة الصورة وراحة المراجع.",
    icon: "ultrasound" as const,
  },
  {
    slug: "doppler-duplex-riyadh",
    english: "Color Doppler & Vascular Imaging",
    title: "وحدة الدوبلر والدوبلكس الملون",
    subtitle: "قراءة أدق لحركة الدم داخل الأوعية.",
    description:
      "تقنيات دوبلر ودوبلكس متقدمة لدراسة تدفق الدم داخل الأوردة والشرايين وتقييم كفاءة الدورة الدموية وفق طلب الطبيب. يقدّم الفحص معلومات مهمة تساعد على تقييم حالات الأوعية الدموية بصورة منظمة ودقيقة تدعم القرار الطبي.",
    icon: "flow" as const,
  },
  {
    slug: "3d-4d-ultrasound-riyadh",
    english: "3D/4D Fetal Imaging",
    title: "وحدة تصوير الأجنة ثلاثي ورباعي الأبعاد",
    subtitle: "لحظات استثنائية.. بتفاصيل أقرب وأوضح.",
    description:
      "تجربة تصوير تجمع بين البعد الإنساني والدقة الطبية، مع صور ثلاثية ورباعية الأبعاد تساعد على إظهار ملامح وحركة الجنين بصورة أكثر وضوحًا. ويُجرى التقييم الطبي وفق عمر الحمل وطلب الطبيب وملاءمة الحالة، بما يضيف مزيدًا من الطمأنينة إلى رحلة المتابعة.",
    icon: "cube" as const,
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
              <span /> تصوير طبي متقدم · حي المربع · الرياض
            </div>
            <h1>
              <span className="hero-title-brand">مركز سما سكان للتصوير الطبي</span>
              <span className="hero-title-slogan">
                حيث تتحول الصورة الدقيقة إلى قرار طبي أكثر وضوحًا.
              </span>
            </h1>
            <p className="hero-lead">
              لأن كل قرار علاجي يبدأ بصورة واضحة، صُمم <strong>سما سكان</strong> ليقدم
              تجربة تصوير طبي تجمع بين التقنية المتقدمة، الدقة في التفاصيل، والاهتمام
              براحة المراجع. من لحظة الحجز إلى استلام نتائج الفحص، نعمل على أن تكون
              رحلتك أكثر سلاسة وهدوءًا، مع معلومات تشخيصية تساعد طبيبك على اتخاذ الخطوة
              التالية بثقة أكبر.
            </p>
            <div className="button-row hero-actions">
              <a
                className="button button-accent"
                href={site.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                data-cta="hero_whatsapp"
              >
                <Icon name="whatsapp" width="21" height="21" /> احجز فحصك
              </a>
              <a
                className="button button-ghost-dark"
                href={site.phoneDial}
                data-cta="hero_call"
              >
                <Icon name="call" width="20" height="20" /> تواصل مع فريق العناية بالمرضى
              </a>
            </div>
            <ul className="hero-points" aria-label="مميزات التواصل والزيارة">
              <li>
                <Icon name="check" /> مواعيد منظمة واهتمام بالتفاصيل
              </li>
              <li>
                <Icon name="check" /> خصوصية وراحة طوال رحلة الفحص
              </li>
              <li>
                <Icon name="check" /> تواصل مباشر قبل الزيارة
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
              <span><small>تجربة المراجع</small><b>راحة وخصوصية</b></span>
            </div>
            <div className="visual-card visual-card-two">
              <Icon name="map" width="22" height="22" />
              <span><small>الرياض</small><b>حي المربع</b></span>
            </div>
          </div>
        </div>
        <div className="container trust-strip" aria-label="معلومات المركز">
          <div><b>4</b><span>وحدات تصوير متخصصة</span></div>
          <div><b>مباشر</b><span>تواصل مع فريق المركز</span></div>
          <div><b>مركزي</b><span>موقع في قلب مدينة الرياض</span></div>
          <div><b>مرن</b><span>تنسيق الموعد قبل الزيارة</span></div>
        </div>
      </section>

      <section className="section services-section" aria-labelledby="services-heading">
        <div className="container">
          <div className="section-head centered reveal">
            <span className="eyebrow">تقنيات تصوير متقدمة</span>
            <h2 id="services-heading">منظومة تشخيصية متكاملة.. تفاصيل أدق لقرار طبي أوضح.</h2>
            <p>
              خلف كل فحص سؤال يحتاج إلى إجابة واضحة. لذلك صُممت وحدات سما سكان لتقدم
              تجربة تصوير متكاملة تركز على جودة الصورة، دقة التفاصيل، وسهولة رحلة المراجع،
              بما يساعد الطبيب على قراءة الحالة بصورة أكثر وضوحًا واطمئنانًا.
            </p>
          </div>
          <div className="service-grid">
            {premiumServices.map((service, index) => (
              <article className="service-card reveal" key={service.slug}>
                <div className="service-card-top">
                  <span className="service-number">0{index + 1}</span>
                  <span className="service-icon">
                    <Icon name={service.icon} width="32" height="32" />
                  </span>
                </div>
                <p className="service-en" lang="en">{service.english}</p>
                <h3>{service.title}</h3>
                <p>
                  <strong>{service.subtitle}</strong>
                  <br />
                  {service.description}
                </p>
                <Link className="card-link" href={`/services/${service.slug}`}>
                  استكشف تفاصيل الفحص <Icon name="arrow" width="18" height="18" />
                </Link>
              </article>
            ))}
          </div>
          <div className="section-action">
            <Link className="button button-secondary" href="/services">
              استعرض منظومة التصوير الطبي <Icon name="arrow" width="18" height="18" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section services-section" aria-labelledby="features-heading">
        <div className="container">
          <div className="section-head centered reveal">
            <span className="eyebrow">لماذا سما سكان؟</span>
            <h2 id="features-heading">معيار يضع الدقة والراحة في قلب التجربة.</h2>
            <p>
              تجربة التصوير الطبي لا تبدأ من الجهاز وحده. تبدأ من احترام وقتك، فهم احتياجك،
              والاهتمام بالتفاصيل التي تجعل الزيارة أكثر هدوءًا ووضوحًا من البداية للنهاية.
            </p>
          </div>
          <div className="service-grid">
            <article className="service-card reveal">
              <div className="service-card-top">
                <span className="service-number">01</span>
                <span className="service-icon"><Icon name="scan" width="32" height="32" /></span>
              </div>
              <h3>تقارير تدعم القرار الطبي</h3>
              <p>
                نهتم بجودة الصورة وتنظيم معلومات الفحص لتقديم نتائج واضحة تساعد الطبيب
                على تقييم الحالة وبناء قراره على بيانات تصويرية دقيقة.
              </p>
            </article>

            <article className="service-card reveal">
              <div className="service-card-top">
                <span className="service-number">02</span>
                <span className="service-icon"><Icon name="shield" width="32" height="32" /></span>
              </div>
              <h3>خصوصية وراحة مدروسة</h3>
              <p>
                بيئة هادئة وتجربة منظمة تراعي خصوصية كل مراجع، مع اهتمام بالتواصل الواضح
                وتقليل القلق المرتبط بالفحوصات قدر الإمكان.
              </p>
            </article>

            <article className="service-card reveal">
              <div className="service-card-top">
                <span className="service-number">03</span>
                <span className="service-icon"><Icon name="clock" width="32" height="32" /></span>
              </div>
              <h3>مواعيد أكثر انضباطًا</h3>
              <p>
                تنسيق مسبق للفحص وتعليماته يساعد على تنظيم وقت الزيارة وتقليل الإجراءات
                غير الضرورية، لتكون تجربتك أكثر سلاسة من الحجز حتى انتهاء الفحص.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section split-section" aria-labelledby="before-visit-heading">
        <div className="container split-grid">
          <div className="content-panel reveal">
            <span className="eyebrow">رحلة المراجع</span>
            <h2 id="before-visit-heading">طريقك إلى صورة أوضح.. سلس، منظم، ومباشر.</h2>
            <p>
              صممنا خطوات الحجز والتحضير لتكون بسيطة قدر الإمكان، مع تواصل واضح يساعدك
              على معرفة ما تحتاج إليه قبل الوصول إلى المركز.
            </p>
            <ol className="steps-list">
              <li>
                <span>1</span>
                <div>
                  <b>التنسيق الذكي</b>
                  <p>تواصل معنا واذكر اسم الفحص أو بيانات الإحالة الأساسية لنحدد معك الموعد ونراجع المتطلبات المناسبة.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <b>تحضير واضح ومخصص للفحص</b>
                  <p>نوضح لك تعليمات التحضير المطلوبة قبل الزيارة بحسب نوع الفحص، حتى تصل وأنت مستعد وواثق من الخطوات.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <b>تجربة هادئة ومنظمة</b>
                  <p>نستقبلك في مركزنا بحي المربع ونتابع خطوات الفحص باهتمام، مع الحرص على راحتك وخصوصيتك طوال الزيارة.</p>
                </div>
              </li>
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
          <div className="location-contact-grid">
            <MapEmbed />
            <LocationContactForm />
          </div>
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

      <CtaSection
        title="لا تترك الغموض يؤخر خطوتك التالية."
        text="عندما تكون الصورة أوضح، يصبح الحوار مع طبيبك أكثر دقة. في سما سكان نركز على جودة الفحص، وضوح التفاصيل، وتجربة مريحة تساعدك على الوصول إلى الخطوة التالية باطمئنان أكبر."
        primaryLabel="احجز موعدك الآن"
      />
    </main>
  );
}
