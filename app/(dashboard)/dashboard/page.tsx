import Link from "next/link";
import Image from "next/image";
import Dashboard from "@/components/dashboard";
import { signedIn } from "@/lib/dashboard/auth";
import { storageReady } from "@/lib/dashboard/database";
import { readAdminConfig } from "@/lib/dashboard/session";
export const dynamic = "force-dynamic";
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await signedIn()) return <Dashboard reconnectHref="/api/dashboard/oauth/start" storageReady={storageReady()} />;
  const { error } = await searchParams;
  const configured = Boolean(readAdminConfig());
  const message = error === "credentials" ? "اسم الدخول أو كلمة المرور غير صحيحة." : error === "rate_limit" ? "محاولات دخول كثيرة. حاول مرة أخرى بعد 15 دقيقة." : error === "setup" ? "دخول admin لم يُفعّل بعد. إعدادات الدخول الآمنة قيد التجهيز." : error ? "لم يكتمل ربط مصدر البيانات. حاول مرة أخرى." : "";
  return <main className="auth-screen"><section className="auth-card">
    <Image src="/sama-scan-logo.png" width={180} height={180} alt="مركز سما سكان للأشعة" priority />
    <span className="eyebrow">SAMA SCAN · CONTROL CENTER</span>
    <h1>كل أداء المركز<br />في مكان واحد</h1>
    <p>تابع الملف التجاري والموقع، فرص التحسين والتواصل، وأدِر منشورات المركز عبر القنوات المتصلة.</p>
    {message && <p className="auth-error" role="alert">{message}</p>}
    <form className="admin-login" action="/api/dashboard/login" method="post">
      <label htmlFor="admin-username">اسم الدخول</label>
      <input id="admin-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={64} placeholder="admin" dir="ltr" />
      <label htmlFor="admin-password">كلمة المرور</label>
      <input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={256} dir="ltr" />
      <button className="button primary" type="submit" disabled={!configured}>دخول لوحة التحكم ←</button>
    </form>
    <small>دخول خاص بإدارة مركز سما سكان</small>
    {!configured && <><p className="auth-setup">تفعيل دخول admin ينتظر حفظ إعدادات الدخول على الخادم.</p><a className="text-link" href="/api/dashboard/oauth/start">الدخول الحالي عبر Windsor.ai</a></>}
    <Link className="auth-back" href="/">العودة لموقع المركز</Link>
  </section></main>;
}
