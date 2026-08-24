export const site = {
  nameAr: "مركز سما سكان",
  nameEn: "Sama Scan Radiology Center",
  shortName: "سما سكان",
  description:
    "مركز سما سكان للأشعة والتصوير الطبي في حي المربع بالرياض: رنين مغناطيسي، سونار وموجات فوق صوتية، دوبلر ودوبلكس، وتصوير ثلاثي ورباعي الأبعاد.",
  phoneDisplay: "+966 55 961 7558",
  phoneE164: "+966559617558",
  phoneDial: "tel:+966559617558",
  whatsapp:
    "https://wa.me/966559617558?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D9%85%D8%B1%D9%83%D8%B2%20%D8%B3%D9%85%D8%A7%20%D8%B3%D9%83%D8%A7%D9%86%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D9%81%D8%AD%D8%B5",
  mapsProfile: "https://maps.app.goo.gl/jskHEGrnXR49tjvp9?g_st=ac",
  directions:
    "https://www.google.com/maps/dir/?api=1&destination=24.663307,46.7053643",
  mapEmbed:
    "https://www.google.com/maps?q=24.663307,46.7053643&z=16&output=embed",
  address:
    "4479 شارع فيصل بن تركي بن عبدالعزيز، حي المربع، الرياض 12584، المملكة العربية السعودية",
  shortAddress: "حي المربع، الرياض",
  latitude: 24.663307,
  longitude: 46.7053643,
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://sama-scan-riyadh.vercel.app",
} as const;

export type Service = {
  slug: string;
  title: string;
  shortTitle: string;
  english: string;
  summary: string;
  keywords: string[];
  icon: "scan" | "ultrasound" | "flow" | "cube";
};

export const services: Service[] = [
  {
    slug: "mri-riyadh",
    title: "الرنين المغناطيسي في الرياض",
    shortTitle: "الرنين المغناطيسي",
    english: "MRI",
    summary:
      "تصوير بالرنين المغناطيسي وفق الطلب الطبي، مع إرشادات واضحة قبل الفحص وتأكيد الموعد عبر الاتصال أو واتساب.",
    keywords: ["رنين مغناطيسي الرياض", "أشعة رنين مغناطيسي", "MRI الرياض"],
    icon: "scan",
  },
  {
    slug: "ultrasound-riyadh",
    title: "السونار والموجات فوق الصوتية في الرياض",
    shortTitle: "السونار والموجات فوق الصوتية",
    english: "Ultrasound",
    summary:
      "فحوصات السونار والموجات فوق الصوتية بحسب نوع الطلب الطبي، مع تأكيد تعليمات التحضير قبل الحضور.",
    keywords: ["سونار الرياض", "موجات فوق صوتية الرياض", "أشعة سونار"],
    icon: "ultrasound",
  },
  {
    slug: "doppler-duplex-riyadh",
    title: "أشعة الدوبلر والدوبلكس في الرياض",
    shortTitle: "الدوبلر والدوبلكس",
    english: "Doppler & Duplex",
    summary:
      "فحوصات بالموجات فوق الصوتية لدراسة تدفق الدم والأوعية بحسب إحالة الطبيب ونوع الفحص المطلوب.",
    keywords: ["أشعة دوبلر الرياض", "دوبلكس الرياض", "سونار دوبلر"],
    icon: "flow",
  },
  {
    slug: "3d-4d-ultrasound-riyadh",
    title: "سونار ثلاثي ورباعي الأبعاد في الرياض",
    shortTitle: "سونار 3D و4D",
    english: "3D & 4D Ultrasound",
    summary:
      "تصوير بالموجات فوق الصوتية ثلاثي ورباعي الأبعاد حسب ملاءمة الحالة والطلب الطبي وتوجيه المختص.",
    keywords: ["سونار ثلاثي الأبعاد الرياض", "سونار رباعي الأبعاد الرياض", "4D الرياض"],
    icon: "cube",
  },
];

export const navItems = [
  { href: "/", label: "الرئيسية" },
  { href: "/services", label: "خدمات الأشعة" },
  { href: "/about", label: "عن المركز" },
  { href: "/location", label: "الموقع" },
  { href: "/contact", label: "تواصل وحجز" },
] as const;

export const neighborhoods = [
  "المربع",
  "الملز",
  "العليا",
  "السليمانية",
  "الفوطة",
  "الوزارات",
  "وسط الرياض",
] as const;
