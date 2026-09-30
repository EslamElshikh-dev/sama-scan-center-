import Link from "next/link";
import Image from "next/image";
import Dashboard from "@/components/dashboard";
import { currentUser } from "@/lib/dashboard/auth";
export const dynamic = "force-dynamic";
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser().catch(() => null);
  if (user) return <Dashboard user={user} />;
  const { error } = await searchParams;
  const message = error === "credentials" ? "اسم الدخول أو كلمة المرور غير صحيحة." : error === "rate_limit" ? "محاولات دخول كثيرة. حاول مرة أخرى بعد 15 دقيقة." : error === "auth_service" ? "تعذّر الاتصال بخدمة الدخول مؤقتًا. حاول مرة أخرى." : error ? "تعذّر فتح اللوحة. حاول مرة أخرى." : "";
  return <main className="auth-screen"><section className="auth-card">
    <Image src="/sama-scan-logo.png" width={180} height={180} alt="مركز سما سكان للأشعة" priority />
    <span className="eyebrow">SAMA SCAN · CRM</span>
    <h1>كل علاقات المركز<br />في مكان واحد</h1>
    <p>أدر التواصل والحجوزات والمواعيد، وتابع نمو المركز من مساحة واحدة.</p>
    {message && <p className="auth-error" role="alert">{message}</p>}
    <form className="admin-login" action="/api/dashboard/login" method="post">
      <label htmlFor="admin-username">اسم الدخول</label>
      <input id="admin-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={64} placeholder="admin" dir="ltr" />
      <label htmlFor="admin-password">كلمة المرور</label>
      <input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={256} dir="ltr" />
      <button className="button primary" type="submit">دخول لوحة التحكم ←</button>
    </form>
    <small>دخول خاص بإدارة مركز سما سكان</small>
    <Link className="auth-back" href="/">العودة لموقع المركز</Link>
  </section></main>;
}
