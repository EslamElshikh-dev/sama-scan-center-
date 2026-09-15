const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://samascan.vercel.app";

const address = {
  streetAddress: "4479 شارع فيصل بن تركي بن عبدالعزيز، حي المربع",
  locality: "الرياض",
  region: "منطقة الرياض",
  postalCode: "12584",
  country: "SA",
} as const;

export const openingHours = {
  weekdays: ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"],
  weekdaysLabel: "السبت إلى الخميس",
  opens: "09:00",
  closes: "21:00",
  display: "9:00 صباحًا – 9:00 مساءً",
  closedDay: "الجمعة",
} as const;

export const socialProfiles = [
  "https://www.instagram.com/samascancenter/",
  "https://www.tiktok.com/@samascancenter",
  "https://www.snapchat.com/add/samascansenter",
  "https://x.com/samascansenter",
] as const;

export const brandAliases = [
  "مركز سما سكان للأشعة التشخيصية بالرياض",
  "سما سكان الرياض",
  "Sama Scan Radiology Center Riyadh",
  "Sama Scan Center Riyadh",
] as const;

export const site = {
  nameAr: "مركز سما سكان للأشعة",
  nameEn: "Sama Scan Radiology Center Riyadh",
  shortName: "سما سكان",
  pageTitle: "مركز سما سكان للأشعة في الرياض | حي المربع",
  socialImage: "/sama-scan-share-v2.png",
  description:
    "مركز سما سكان للأشعة والتصوير الطبي في حي المربع بالرياض: رنين مغناطيسي، سونار وموجات فوق صوتية، دوبلر ودوبلكس، وتصوير ثلاثي ورباعي الأبعاد.",
  phoneDisplay: "+966 55 961 7558",
  phoneE164: "+966559617558",
  phoneDial: "tel:+966559617558",
  whatsapp:
    "https://wa.me/966559617558?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D9%85%D8%B1%D9%83%D8%B2%20%D8%B3%D9%85%D8%A7%20%D8%B3%D9%83%D8%A7%D9%86%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D9%81%D8%AD%D8%B5",
  mapsProfile: "https://maps.app.goo.gl/P4aQryrJiom5xCL89?g_st=ac",
  googleBusinessCid: "249734721661275541",
  directions:
    "https://www.google.com/maps/dir/?api=1&destination=24.663307,46.7053643",
  mapEmbed:
    "https://www.google.com/maps?q=24.663307,46.7053643&z=16&output=embed",
  address: `${address.streetAddress}، ${address.locality} ${address.postalCode}، المملكة العربية السعودية`,
  streetAddress: address.streetAddress,
  addressLocality: address.locality,
  addressRegion: address.region,
  postalCode: address.postalCode,
  addressCountry: address.country,
  shortAddress: "حي المربع، الرياض",
  latitude: 24.663307,
  longitude: 46.7053643,
  siteUrl,
  appointmentUrl: `${siteUrl}/contact`,
  googleBusinessWebsiteUrl: `${siteUrl}/?utm_source=google&utm_medium=organic&utm_campaign=gbp&utm_content=profile_website`,
  googleBusinessAppointmentUrl: `${siteUrl}/contact?utm_source=google&utm_medium=organic&utm_campaign=gbp&utm_content=appointment`,
} as const;

export type Service = {
  slug: string;
  title: string;
  shortTitle: string;
  english: string;
  summary: string;
  keywords: string[];
  imagingTechnique: "MRI" | "Ultrasound";
  icon: "scan" | "ultrasound" | "flow" | "cube";
  image: string;
  imageAlt: string;
  imageCaption: string;
};

export const services: Service[] = [
  {
    slug: "mri-riyadh",
    title: "الرنين المغناطيسي في الرياض",
    shortTitle: "الرنين المغناطيسي",
    english: "MRI",
    summary:
      "تصوير بالرنين المغناطيسي وفق الطلب الطبي، مع إرشادات واضحة قبل الفحص وتأكيد الموعد عبر الاتصال أو واتساب.",
    keywords: [
      "رنين مغناطيسي بالرياض",
      "مركز رنين مغناطيسي بالرياض",
      "حجز MRI الرياض",
      "تصوير رنين مغناطيسي",
    ],
    imagingTechnique: "MRI",
    icon: "scan",
    image: "/mri-room-sama-scan-riyadh.webp",
    imageAlt: "جهاز الرنين المغناطيسي في مركز سما سكان للأشعة بحي المربع في الرياض",
    imageCaption: "صورة فعلية من وحدة الرنين المغناطيسي في مركز سما سكان.",
  },
  {
    slug: "ultrasound-riyadh",
    title: "السونار والموجات فوق الصوتية في الرياض",
    shortTitle: "السونار والموجات فوق الصوتية",
    english: "Ultrasound",
    summary:
      "فحوصات السونار والموجات فوق الصوتية بحسب نوع الطلب الطبي، مع تأكيد تعليمات التحضير قبل الحضور.",
    keywords: [
      "سونار بالرياض",
      "موجات فوق صوتية بالرياض",
      "مركز سونار بالرياض",
      "حجز سونار الرياض",
    ],
    imagingTechnique: "Ultrasound",
    icon: "ultrasound",
    image: "/ultrasound-room-sama-scan-riyadh.webp",
    imageAlt: "غرفة السونار والموجات فوق الصوتية في مركز سما سكان بالرياض",
    imageCaption: "صورة فعلية من غرفة الموجات فوق الصوتية في مركز سما سكان.",
  },
  {
    slug: "doppler-duplex-riyadh",
    title: "أشعة الدوبلر والدوبلكس في الرياض",
    shortTitle: "الدوبلر والدوبلكس",
    english: "Doppler & Duplex",
    summary:
      "فحوصات بالموجات فوق الصوتية لدراسة تدفق الدم والأوعية بحسب إحالة الطبيب ونوع الفحص المطلوب.",
    keywords: [
      "أشعة دوبلر بالرياض",
      "أشعة دوبلكس بالرياض",
      "دوبلر أوعية دموية بالرياض",
      "سونار دوبلر بالرياض",
    ],
    imagingTechnique: "Ultrasound",
    icon: "flow",
    image: "/ultrasound-exam-room-riyadh.webp",
    imageAlt: "جهاز الدوبلر والدوبلكس بالموجات فوق الصوتية في مركز سما سكان بالرياض",
    imageCaption: "جهاز الموجات فوق الصوتية المستخدم ضمن فحوص الدوبلر والدوبلكس.",
  },
  {
    slug: "3d-4d-ultrasound-riyadh",
    title: "سونار ثلاثي ورباعي الأبعاد في الرياض",
    shortTitle: "سونار 3D و4D",
    english: "3D & 4D Ultrasound",
    summary:
      "تصوير بالموجات فوق الصوتية ثلاثي ورباعي الأبعاد حسب ملاءمة الحالة والطلب الطبي وتوجيه المختص.",
    keywords: [
      "سونار 3D بالرياض",
      "سونار 4D بالرياض",
      "سونار ثلاثي الأبعاد بالرياض",
      "سونار رباعي الأبعاد بالرياض",
    ],
    imagingTechnique: "Ultrasound",
    icon: "cube",
    image: "/center-ultrasound.webp",
    imageAlt: "جهاز سونار ثلاثي ورباعي الأبعاد في مركز سما سكان بالرياض",
    imageCaption: "صورة فعلية لجهاز الموجات فوق الصوتية داخل المركز.",
  },
];

export const navItems = [
  { href: "/", label: "الرئيسية" },
  { href: "/services", label: "خدمات الأشعة" },
  { href: "/blog", label: "المدونة" },
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
