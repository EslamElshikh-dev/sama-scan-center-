import Link from "next/link";

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
