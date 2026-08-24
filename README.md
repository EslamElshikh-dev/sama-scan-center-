# مركز سما سكان — Sama Scan Riyadh

موقع إنتاجي متعدد الصفحات لمركز سما سكان للأشعة والتصوير الطبي في حي المربع بمدينة الرياض.

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
- نقاط قياس جاهزة لنقرات الاتصال وواتساب دون تحميل أداة تحليلات خارجية

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

انسخ `.env.example` إلى `.env.local` عند ربط نطاق مخصص، وحدّث `NEXT_PUBLIC_SITE_URL` إلى الرابط الأساسي النهائي.
