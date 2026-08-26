import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function NotFound() {
  return (
    <main id="main-content" className="not-found">
      <div className="container">
        <span>404</span>
        <h1>الصفحة غير موجودة</h1>
        <p>قد يكون الرابط قديمًا أو كُتب بطريقة غير صحيحة.</p>
        <Link className="button" href="/">العودة إلى الرئيسية</Link>
      </div>
    </main>
  );
}
