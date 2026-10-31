const contentNames: Record<string, string> = {
  appointment: "رابط الحجز الرئيسي في الملف",
  profile_website: "رابط الموقع في الملف",
  offer_ultrasound_250_oct2026: "عرض السونار · أكتوبر 2026",
  offer_mri_600_oct2026: "عرض الرنين · أكتوبر 2026",
};

export function gbpContentName(content?: string) {
  return content ? contentNames[content] || "منشور أو رابط موسوم" : "رابط بلا وسم منشور";
}

export function gbpContentExportLabel(row: { campaign?: string; content?: string }) {
  return [gbpContentName(row.content), row.campaign, row.content].filter(Boolean).join(" · ");
}
