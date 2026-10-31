const contentNames: Record<string, string> = {
  appointment: "رابط الحجز الرئيسي في الملف",
  profile_website: "رابط الموقع في الملف",
  offer_ultrasound_250_oct2026: "عرض السونار · أكتوبر 2026",
  offer_mri_600_oct2026: "عرض الرنين · أكتوبر 2026",
  visit_location_20261031: "التعرّف على موقع المركز · 31 أكتوبر",
  booking_steps_20261031: "طلب الحجز بخطوة واضحة · 31 أكتوبر",
  mri_request_20261031: "طلب فحص الرنين · 31 أكتوبر",
  ultrasound_visit_20261031: "موعد الموجات فوق الصوتية · 31 أكتوبر",
  doppler_visit_20261031: "موعد الدوبلر والدوبلكس · 31 أكتوبر",
};

export function gbpContentName(content?: string) {
  return content ? contentNames[content] || "منشور أو رابط موسوم" : "رابط بلا وسم منشور";
}

export function gbpContentExportLabel(row: { campaign?: string; content?: string }) {
  return [gbpContentName(row.content), row.campaign, row.content].filter(Boolean).join(" · ");
}
