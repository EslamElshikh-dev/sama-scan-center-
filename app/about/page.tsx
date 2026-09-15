import Link from "next/link";
import { CtaSection } from "@/components/cta-section";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "عن مركز سما سكان للأشعة بالرياض",
  description:
    "تعرف على مركز سما سكان للأشعة والتصوير الطبي في حي المربع بالرياض، وخدماته وطريقة التواصل وتأكيد الفحوصات قبل الزيارة.",
  path: "/about",
});

const values = [
  {
    icon: "scan" as const,
    title: "وضوح الخدمة",
    text: "صفحات مستقلة تشرح كل فحص متوفر باسمه الطبي ومصطلحه الشائع دون خلط بين الخدمات.",
  },
  {
    icon: "shield" as const,
    title: "سلامة المعلومات",
    text: "تنبيهات واضحة حول التحضير ومحاذير الفحص، مع التأكيد أن تعليمات الطبيب والفريق الطبي هي المرجع.",
  },
  {
    icon: "call" as const,
    title: "تواصل مباشر",
    text: "رقم موحد للاتصال وواتساب لتأكيد نوع الفحص والتعليمات والموعد قبل الانتقال إلى المركز.",
  },
  {
    icon: "map" as const,
    title: "مركز قريب في قلب الرياض",
    text: "موقع واضح في حي المربع مع خريطة واتجاهات مباشرة ومواعيد استقبال منشورة قبل الزيارة.",
  },
];

const editorialStandards = [
  {
    title: "مصادر ظاهرة للقارئ",
    text: "تذكر صفحات الخدمات والمقالات المراجع الطبية المستخدمة، مع روابطها وتاريخ آخر تحديث للمحتوى.",
  },
  {
    title: "فصل التثقيف عن التشخيص",
    text: "المحتوى يشرح الفحص والاستعداد العام، ولا يقدّم تشخيصًا أو يغيّر تعليمات الطبيب أو فريق الأشعة.",
  },
  {
    title: "نسب المسؤولية بوضوح",
    text: "ينشر المركز المحتوى بصفته الجهة المسؤولة عنه، ولا ننسب مراجعته إلى طبيب مسمّى إلا بعد مراجعة فعلية وموافقة موثقة.",
  },
];

export default function AboutPage() {
  return (
    <main id="main-content">
      <PageHero
        eyebrow="Sama Scan Radiology Center"
        title="عن مركز سما سكان"
        description="مركز للأشعة والتصوير الطبي في حي المربع بمدينة الرياض، يتيح التواصل المباشر لتأكيد الفحص المطلوب والاستعداد للزيارة."
        breadcrumbs={[{ label: "عن المركز", href: "/about" }]}
      />

      <section className="section about-intro">
        <div className="container article-layout">
          <article className="article-content">
            <span className="eyebrow">مركز تصوير طبي في الرياض</span>
            <h2>مركز تصوير تشخيصي يخدم المراجع قبل الفحص وبعده</h2>
            <p>
              يقدّم مركز سما سكان خدمات الرنين المغناطيسي، السونار والموجات فوق
              الصوتية، الدوبلر والدوبلكس، والتصوير ثلاثي ورباعي الأبعاد. صُمم
              ويعرض هذا الموقع الخدمات المتوفرة وصورًا فعلية من بيئة المركز،
              مع إرشادات تساعد المراجع على فهم خطوات الحجز والتحضير دون أن
              تحل محل الاستشارة أو التشخيص الطبي.
            </p>
            <p>
              يقع المركز في حي المربع بوسط الرياض. ولأن متطلبات التصوير تختلف
              بحسب المنطقة والإحالة والحالة الصحية، نوصي دائمًا بالتواصل على
              الرقم الموحد قبل الحضور لتأكيد الموعد وأي تعليمات خاصة.
            </p>
          </article>
          <aside className="appointment-card simple-card">
            <span className="eyebrow">بيانات موحدة</span>
            <h2>{site.nameAr}</h2>
            <dl className="fact-list">
              <div><dt>الاسم الإنجليزي</dt><dd lang="en">{site.nameEn}</dd></div>
              <div><dt>المدينة</dt><dd>الرياض</dd></div>
              <div><dt>الحي</dt><dd>المربع</dd></div>
              <div><dt>الهاتف وواتساب</dt><dd dir="ltr">{site.phoneDisplay}</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="section editorial-standards" aria-labelledby="editorial-heading">
        <div className="container article-layout">
          <div className="section-head">
            <span className="eyebrow">سياسة المحتوى الطبي</span>
            <h2 id="editorial-heading">كيف نعرض المعلومات الطبية بمسؤولية؟</h2>
            <p>
              هدف المحتوى هو مساعدة المراجع على طرح الأسئلة الصحيحة والاستعداد
              للموعد. القرار الطبي وتفسير النتائج يظلان لدى الطبيب والمختصين.
            </p>
          </div>
          <div className="editorial-list">
            {editorialStandards.map((item, index) => (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{item.title}</h3><p>{item.text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section values-section" aria-labelledby="values-heading">
        <div className="container">
          <div className="section-head centered">
            <span className="eyebrow">مبادئ التجربة</span>
            <h2 id="values-heading">معلومات مفيدة من البحث حتى الوصول</h2>
          </div>
          <div className="values-grid">
            {values.map((value) => (
              <article key={value.title}>
                <span className="service-icon"><Icon name={value.icon} width="29" height="29" /></span>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </article>
            ))}
          </div>
          <div className="section-action">
            <Link className="button button-secondary" href="/services">
              تعرف على خدمات المركز <Icon name="arrow" width="18" height="18" />
            </Link>
          </div>
        </div>
      </section>
      <CtaSection />
    </main>
  );
}
