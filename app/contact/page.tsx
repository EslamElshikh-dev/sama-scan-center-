import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { services, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "تواصل وحجز موعد أشعة في الرياض",
  description:
    "اتصل أو تواصل عبر واتساب مع مركز سما سكان للأشعة في حي المربع بالرياض لتأكيد نوع الفحص والتعليمات والموعد.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main id="main-content">
      <PageHero
        eyebrow="اتصال وواتساب"
        title="تواصل مع مركز سما سكان"
        description="للحجز أو الاستفسار، اذكر اسم الفحص والمنطقة كما وردا في الطلب الطبي، وسيساعدك التواصل المباشر على تأكيد التعليمات قبل الزيارة."
        breadcrumbs={[{ label: "تواصل وحجز", href: "/contact" }]}
      />

      <section className="section contact-section">
        <div className="container contact-grid">
          <article className="contact-card whatsapp-card">
            <span className="contact-icon"><Icon name="whatsapp" width="34" height="34" /></span>
            <span className="eyebrow eyebrow-light">محادثة مباشرة</span>
            <h2>الحجز عبر واتساب</h2>
            <p>
              أرسل اسم الفحص والمنطقة المطلوبة فقط لتأكيد التوفر والتعليمات.
              تجنب إرسال بيانات صحية حساسة غير ضرورية.
            </p>
            <a className="button button-light" href={site.whatsapp} target="_blank" rel="noopener noreferrer" data-cta="contact_whatsapp">
              فتح واتساب <Icon name="arrow" width="18" height="18" />
            </a>
          </article>
          <article className="contact-card call-card">
            <span className="contact-icon"><Icon name="call" width="34" height="34" /></span>
            <span className="eyebrow">تواصل صوتي</span>
            <h2>الاتصال بالمركز</h2>
            <p>
              اتصل للاستفسار عن الفحص والموعد وساعات العمل أو للحصول على
              تعليمات التحضير الملائمة لطلب الطبيب.
            </p>
            <a className="button" href={site.phoneDial} data-cta="contact_call">
              <span dir="ltr">{site.phoneDisplay}</span> <Icon name="call" width="18" height="18" />
            </a>
          </article>
        </div>
      </section>

      <section className="section booking-guide" aria-labelledby="booking-heading">
        <div className="container article-layout">
          <article className="article-content">
            <span className="eyebrow">لتواصل أسرع</span>
            <h2 id="booking-heading">جهّز هذه المعلومات قبل الاتصال</h2>
            <ul className="feature-list compact-list">
              <li><span><Icon name="check" width="19" height="19" /></span>اسم الفحص كما هو مكتوب في الإحالة.</li>
              <li><span><Icon name="check" width="19" height="19" /></span>المنطقة والجهة المطلوبة عند وجودها.</li>
              <li><span><Icon name="check" width="19" height="19" /></span>التاريخ والوقت المفضلان للموعد.</li>
              <li><span><Icon name="check" width="19" height="19" /></span>أي تعليمات خاصة ذكرها الطبيب.</li>
            </ul>
          </article>
          <aside className="appointment-card simple-card">
            <span className="eyebrow">اختر الخدمة</span>
            <h2>صفحات الفحوصات</h2>
            <ul className="mini-service-list">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link href={`/services/${service.slug}`}>
                    {service.shortTitle}<Icon name="arrow" width="16" height="16" />
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
