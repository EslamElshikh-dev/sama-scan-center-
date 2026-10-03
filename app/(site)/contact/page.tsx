import Link from "next/link";
import { Icon } from "@/components/icons";
import { LocationContactForm } from "@/components/location-contact-form";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { openingHours, site } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "تواصل وحجز موعد أشعة في الرياض",
  description:
    "أرسل طلب حجز فحصك إلى استقبال مركز سما سكان للأشعة في حي المربع بالرياض. اختر الفحص واليوم والفترة، ثم انتظر تأكيد الموعد.",
  path: "/contact",
});

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  return (
    <main id="main-content">
      <PageHero
        eyebrow="حجز فحص · الرياض، حي المربع"
        title="اطلب موعدك في سما سكان"
        description="اختر الفحص واليوم والفترة المناسبين لك. يصل طلبك إلى الاستقبال، ثم نتواصل معك لتأكيد الموعد وتعليمات التحضير."
        breadcrumbs={[{ label: "تواصل وحجز", href: "/contact" }]}
      />

      <section className="section booking-guide" aria-label="نموذج طلب الحجز">
        <div className="container article-layout">
          <LocationContactForm initialService={service} />
          <aside className="appointment-card simple-card">
            <span className="eyebrow">ماذا يحدث بعد الإرسال؟</span>
            <h2>خطوات موعدك</h2>
            <ol className="booking-steps">
              <li><strong>نستلم طلبك</strong><p>يظهر لك رقم مرجعي لمتابعته.</p></li>
              <li><strong>يؤكد الاستقبال الموعد</strong><p>نراجع توفر الفحص والوقت وتعليمات التحضير قبل الزيارة.</p></li>
              <li><strong>تصل إلى المركز</strong><p>أحضر طلب الفحص والوثائق التي يحددها لك الاستقبال.</p></li>
            </ol>
            <p>{openingHours.weekdaysLabel}، {openingHours.display}. الجمعة مغلق.</p>
            <Link className="button button-secondary" href="/location">موقع المركز والاتجاهات</Link>
          </aside>
        </div>
      </section>

      <section className="section contact-section">
        <div className="container contact-grid">
          <article className="contact-card whatsapp-card">
            <span className="contact-icon"><Icon name="whatsapp" width="34" height="34" /></span>
            <span className="eyebrow eyebrow-light">محادثة مباشرة</span>
            <h2>استفسر عبر واتساب</h2>
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
              اتصل للاستفسار عن الفحص والموعد أو للحصول على
              تعليمات التحضير الملائمة لطلب الطبيب.
            </p>
            <a className="button" href={site.phoneDial} data-cta="contact_call">
              <span dir="ltr">{site.phoneDisplay}</span> <Icon name="call" width="18" height="18" />
            </a>
          </article>
        </div>
      </section>

      <section className="section contact-hours-section" aria-labelledby="contact-hours-title">
        <div className="container contact-hours-card">
          <span className="contact-hours-icon"><Icon name="clock" width="30" height="30" /></span>
          <div>
            <span className="eyebrow">مواعيد استقبال المركز</span>
            <h2 id="contact-hours-title">{openingHours.weekdaysLabel}</h2>
            <p>{openingHours.display}، و{openingHours.closedDay} مغلق. يُفضّل تأكيد موعد الفحص قبل الحضور.</p>
          </div>
          <a className="button button-secondary" href={site.phoneDial} data-cta="contact_hours_call">
            تأكيد الموعد <Icon name="call" width="18" height="18" />
          </a>
        </div>
      </section>


    </main>
  );
}
