"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { getSessionAttribution, sendAnalyticsEvent } from "@/lib/attribution";
import { site } from "@/lib/site";

const bookingServices = [
  { slug: "mri-riyadh", exam: "رنين مغناطيسي" },
  { slug: "ultrasound-riyadh", exam: "سونار" },
  { slug: "doppler-duplex-riyadh", exam: "دوبلر" },
  { slug: "3d-4d-ultrasound-riyadh", exam: "سونار 3D / 4D" },
];
const periods = { morning: "صباحًا · 9 ص – 1 م", afternoon: "ظهرًا · 1 م – 5 م", evening: "مساءً · 5 م – 9 م" };
function dayInRiyadh() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const subscribeDay = () => () => {};

export function LocationContactForm({ initialService = "" }: { initialService?: string }) {
  const requestId = useRef("");
  const submitting = useRef(false);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const today = useSyncExternalStore(subscribeDay, dayInRiyadh, () => "");
  const maxDay = new Date(`${today || "2026-01-01"}T12:00:00Z`);
  maxDay.setUTCDate(maxDay.getUTCDate() + 60);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    const data = new FormData(event.currentTarget);
    const requestedDate = String(data.get("date") ?? "");
    const requestedPeriod = String(data.get("period") ?? "");
    if (new Date(`${requestedDate}T12:00:00+03:00`).getUTCDay() === 5) {
      setError("المركز مغلق يوم الجمعة. اختر يومًا من السبت إلى الخميس."); return;
    }
    const attribution = getSessionAttribution();
    const phone = String(data.get("phone") ?? "").trim().replace(/[٠-٩۰-۹]/g, c => String("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹".indexOf(c) % 10)).replace(/[\s()-]/g, "");
    if (!/^(05\d{8}|(?:\+966|00966|966)5\d{8})$/.test(phone)) {
      setError("أدخل رقم جوال سعودي صحيح، مثل 05xxxxxxxx."); return;
    }
    requestId.current ||= crypto.randomUUID();
    submitting.current = true; setBusy(true);
    try {
      const response = await fetch("/api/booking", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId.current, name: data.get("name"), phone, exam: data.get("service"),
          requested_date: requestedDate, requested_period: requestedPeriod, consent: data.get("consent") === "on",
          company: data.get("company"), attribution: {
            channel: attribution.channel, source: attribution.source.slice(0, 128), medium: attribution.medium.slice(0, 128),
            campaign: attribution.campaign.slice(0, 128), content: attribution.content.slice(0, 128),
            landingPage: attribution.landingPage.slice(0, 200), referrerHost: attribution.referrerHost.slice(0, 200),
          },
        }), signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !/^SS-[A-F0-9]{12}$/.test(result.reference)) {
        setError(result.code === "rate_limit" ? "وصلنا عدة طلبات بهذا الرقم. انتظر قليلًا أو اتصل بالاستقبال." : result.code === "invalid" ? "راجع الاسم والجوال واليوم والفترة المختارين، ثم أعد الإرسال." : "تعذّر التأكد من استلام الطلب. أعد المحاولة بنفس البيانات أو اتصل بالاستقبال.");
        return;
      }
      setReference(result.reference);
      // No patient name, phone, exam or request identifier enters analytics.
      sendAnalyticsEvent("booking_request_saved", { lead_channel: "website_form", traffic_channel: attribution.channel });
      requestAnimationFrame(() => successHeading.current?.focus());
    } catch {
      setError("تعذّر التأكد من استلام الطلب. أعد المحاولة بنفس البيانات أو اتصل بالاستقبال.");
    } finally { submitting.current = false; setBusy(false); }
  }

  if (reference) return <div className="location-contact-form booking-success" role="status">
    <span className="contact-form-icon"><Icon name="check" width="26" height="26" /></span>
    <h3 tabIndex={-1} ref={successHeading}>وصل طلبك إلى الاستقبال</h3>
    <p>رقم طلبك <strong dir="ltr">{reference}</strong></p>
    <p>طلبك بانتظار تأكيد الموعد. سيتواصل معك الاستقبال لمراجعة توفر الفحص والوقت وتعليمات التحضير.</p>
    <p>الاستقبال من السبت إلى الخميس، 9 صباحًا إلى 9 مساءً.</p>
    <div className="button-row">
      <a className="button" href={`https://wa.me/${site.phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent(`مرحبًا، أتابع طلب الحجز رقم ${reference}`)}`} target="_blank" rel="noopener noreferrer">متابعة عبر واتساب</a>
      <a className="button button-secondary" href={site.phoneDial}>اتصل بالاستقبال</a>
    </div>
  </div>;

  return <form id="booking-form" method="post" action="/api/booking" className="location-contact-form" aria-describedby="location-form-note" onSubmit={handleSubmit}>
    <div className="location-form-heading">
      <span className="contact-form-icon"><Icon name="scan" width="24" height="24" /></span>
      <div><span className="eyebrow">خطوتك الأولى للموعد</span><h3>اطلب حجز فحصك</h3></div>
    </div>
    <fieldset className="booking-fieldset" disabled={busy}>
      <div className="location-form-fields">
        <label><span>الاسم</span><input type="text" name="name" autoComplete="name" placeholder="اسم مقدم الطلب" minLength={2} maxLength={100} required /></label>
        <label><span>رقم الجوال للتواصل</span><input type="tel" name="phone" autoComplete="tel" inputMode="tel" maxLength={25} placeholder="05xxxxxxxx" dir="ltr" required /></label>
        <label><span>الفحص المطلوب</span><select name="service" aria-label="الفحص المطلوب" defaultValue={bookingServices.find(s => s.slug === initialService)?.exam || ""} required>
          <option value="" disabled>اختر الفحص</option>{bookingServices.map(s => <option key={s.slug} value={s.exam}>{s.exam}</option>)}
        </select></label>
        <div className="booking-preferences">
          <label><span>اليوم المفضل</span><input type="date" name="date" min={today || undefined} max={today ? maxDay.toISOString().slice(0, 10) : undefined} required /></label>
          <label><span>الفترة المفضلة</span><select name="period" aria-label="الفترة المفضلة" defaultValue="" required><option value="" disabled>اختر الفترة</option>{Object.entries(periods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
        <label className="booking-honeypot" aria-hidden="true"><span>الشركة</span><input name="company" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <p className="location-form-note" id="location-form-note">اليوم والفترة تفضيلات للحجز؛ يؤكد الاستقبال الموعد بعد مراجعة التوفر. الجمعة مغلق. لا تُرسل تقارير أو بيانات طبية حساسة هنا.</p>
      <label className="booking-consent"><input type="checkbox" name="consent" required /><span>أوافق على حفظ بيانات هذا الطلب والتواصل معي لترتيب الموعد وفق <Link href="/privacy">سياسة الخصوصية</Link>.</span></label>
    </fieldset>
    {error && <p className="booking-error" role="alert">{error} <a href={site.phoneDial}>اتصل بالمركز</a></p>}
    <div className="location-form-actions"><button className="button" type="submit" disabled={busy}>{busy ? "جارٍ إرسال الطلب…" : "إرسال طلب الحجز"}</button></div>
  </form>;
}
