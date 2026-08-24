import type { Metadata } from "next";
import Link from "next/link";
import { CtaSection } from "@/components/cta-section";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "عن مركز سما سكان للأشعة بالرياض",
  description:
    "تعرف على مركز سما سكان للأشعة والتصوير الطبي في حي المربع بالرياض، وخدماته وطريقة التواصل وتأكيد الفحوصات قبل الزيارة.",
  alternates: { canonical: "/about" },
};

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
    title: "كيان محلي موثق",
    text: "اسم وعنوان وهاتف وإحداثيات متسقة تربط الموقع بملف مركز سما سكان على خرائط Google.",
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
            <h2>هوية محلية واضحة وتجربة رقمية عملية</h2>
            <p>
              يقدّم مركز سما سكان خدمات الرنين المغناطيسي، السونار والموجات فوق
              الصوتية، الدوبلر والدوبلكس، والتصوير ثلاثي ورباعي الأبعاد. صُمم
              هذا الموقع ليكون مرجعًا واضحًا للمراجع قبل الزيارة، وليس بديلًا
              عن الاستشارة أو التشخيص الطبي.
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
