# مركز سما سكان — Sama Scan Riyadh

موقع إنتاجي متعدد الصفحات لمركز سما سكان للأشعة والتصوير الطبي في حي المربع بمدينة الرياض.

النطاق الأساسي للفهرسة والمشاركة هو `https://samascan.vercel.app`، وتُحوّل
النطاقات التجريبية القديمة إليه بصورة دائمة عند نشر المصدر نفسه عليها.

## الخدمات

- الرنين المغناطيسي MRI
- السونار والموجات فوق الصوتية
- أشعة الدوبلر والدوبلكس
- سونار ثلاثي ورباعي الأبعاد 3D و4D

## التقنية

- Next.js 16 App Router
- React Server Components افتراضيًا
- تصميم RTL متجاوب دون مكتبات واجهة أو خطوط خارجية
- خريطة Google تُحمّل عند الطلب فقط
- LocalBusiness وMedicalClinic وImagingTest وFAQPage وBreadcrumbList JSON-LD
- Sitemap وRobots وWeb Manifest وOpen Graph
- قياس نقرات الاتصال وواتساب وطلبات النماذج، مع دعم مصدر الزيارة UTM
- دعم Google Analytics 4 عند إضافة معرّف القياس في متغيرات البيئة

## التشغيل

```bash
npm install
npm run dev
```

## الفحص والإنتاج

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

انسخ `.env.example` إلى `.env.local` عند ربط نطاق مخصص، وحدّث
`NEXT_PUBLIC_SITE_URL` إلى الرابط الأساسي النهائي. ولتفعيل قياس التحويلات، أضف
معرّف GA4 بصيغة `G-XXXXXXXXXX` في `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`.

الأحداث المرسلة إلى GA4 هي `cta_click` لنقرات الاتصال وواتساب والخرائط، و
`generate_lead` عند إرسال نموذج طلب التواصل. لا تُرسل أسماء المراجعين أو أرقامهم
أو تفاصيلهم الطبية إلى أداة التحليلات.
