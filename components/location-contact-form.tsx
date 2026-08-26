"use client";

import type { FormEvent } from "react";
import { Icon } from "@/components/icons";
import { services, site } from "@/lib/site";

export function LocationContactForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const service = String(data.get("service") ?? "").trim();
    const details = String(data.get("details") ?? "").trim();

    if (!name || !phone || !service) return;

    const message = [
      "مرحبًا مركز سما سكان،",
      "أرغب في طلب تواصل من الموقع.",
      "",
      `الاسم: ${name}`,
      `رقم الجوال: ${phone}`,
      `الخدمة المطلوبة: ${service}`,
      `تفاصيل إضافية: ${details || "لا توجد"}`,
    ].join("\n");
    const whatsappNumber = site.phoneE164.replace(/\D/g, "");

    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <form
      className="location-contact-form"
      aria-describedby="location-form-note"
      onSubmit={handleSubmit}
    >
      <div className="location-form-heading">
        <span className="contact-form-icon">
          <Icon name="whatsapp" width="24" height="24" />
        </span>
        <div>
          <span className="eyebrow">تواصل سريع</span>
          <h3>أرسل طلبك عبر واتساب</h3>
        </div>
      </div>

      <div className="location-form-fields">
        <label>
          <span>الاسم</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            placeholder="اكتب الاسم"
            required
          />
        </label>
        <label>
          <span>رقم الجوال</span>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
            placeholder="05xxxxxxxx"
            dir="ltr"
            required
          />
        </label>
        <label>
          <span>الخدمة المطلوبة</span>
          <select name="service" defaultValue="" required>
            <option value="" disabled>اختر الخدمة</option>
            {services.map((service) => (
              <option key={service.slug} value={service.shortTitle}>
                {service.shortTitle}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>تفاصيل إضافية <small>(اختياري)</small></span>
          <textarea
            name="details"
            rows={3}
            maxLength={500}
            placeholder="أضف أي تفاصيل تساعدنا على فهم طلبك"
          />
        </label>
      </div>

      <p className="location-form-note" id="location-form-note">
        عند الإرسال سيفتح واتساب بالبيانات المدخلة. تجنب كتابة معلومات طبية حساسة غير ضرورية.
      </p>
      <div className="location-form-actions">
        <button className="button" type="submit" data-cta="location_form_whatsapp">
          إرسال
        </button>
      </div>
    </form>
  );
}
