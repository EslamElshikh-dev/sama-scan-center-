import { Icon } from "@/components/icons";
import { site } from "@/lib/site";

export function CtaSection({
  title = "هل لديك طلب فحص أو إحالة طبية؟",
  text = "تواصل مع مركز سما سكان لتأكيد توفر الفحص، تعليمات التحضير والموعد المناسب قبل الحضور.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="cta-section" aria-labelledby="cta-heading">
      <div className="container cta-inner">
        <div>
          <span className="eyebrow eyebrow-light">خطوة واضحة قبل الزيارة</span>
          <h2 id="cta-heading">{title}</h2>
          <p>{text}</p>
        </div>
        <div className="button-row">
          <a
            className="button button-light"
            href={site.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="section_whatsapp"
          >
            <Icon name="whatsapp" width="20" height="20" /> تواصل واتساب
          </a>
          <a
            className="button button-outline-light"
            href={site.phoneDial}
            data-cta="section_call"
          >
            <Icon name="call" width="19" height="19" /> اتصل الآن
          </a>
        </div>
      </div>
    </section>
  );
}
