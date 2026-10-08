import Link from "next/link";
import { Icon } from "@/components/icons";
import { openingHours, site } from "@/lib/site";

export function ContactFirstActions({ service, slug = "center" }: { service?: string; slug?: string }) {
  const message = service
    ? `مرحبًا سما سكان، كم سعر فحص ${service} وما أقرب موعد متاح؟`
    : "مرحبًا سما سكان، أريد معرفة سعر الفحص وأقرب موعد متاح.";
  const whatsapp = `https://wa.me/${site.phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
  return <div className="contact-first">
    <div className="contact-first-actions">
      <a className="button button-light" href={site.phoneDial} data-cta={`hero_${slug}_call`}>
        <Icon name="call" width="20" height="20" /> اتصل بسما سكان <span dir="ltr">0559617558</span>
      </a>
      <a className="button contact-first-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer" data-cta={`hero_${slug}_whatsapp`}>
        <Icon name="whatsapp" width="21" height="21" /> اسأل عن السعر والموعد
      </a>
      <Link className="contact-first-form" href={service ? `/contact?service=${slug}#booking-form` : "#booking-form"} data-cta={`hero_${slug}_booking`}>
        أو أرسل طلب حجز <Icon name="arrow" width="17" height="17" />
      </Link>
    </div>
    <p className="contact-first-facts">حي المربع، الرياض · {openingHours.weekdaysLabel} · ٩ صباحًا إلى ٩ مساءً</p>
    <p className="contact-first-note">السعر والتوفر حسب نوع الفحص؛ يؤكد الاستقبال التفاصيل قبل الحجز.</p>
  </div>;
}
