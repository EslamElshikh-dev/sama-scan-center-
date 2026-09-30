import Link from "next/link";
import Image from "next/image";
import Dashboard from "@/components/dashboard";
import { signedIn } from "@/lib/dashboard/auth";
import { storageReady } from "@/lib/dashboard/database";
export const dynamic = "force-dynamic";
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await signedIn()) return <Dashboard reconnectHref="/api/dashboard/oauth/start" storageReady={storageReady()} />;
  const { error } = await searchParams;
  return <main className="auth-screen"><section className="auth-card">
    <Image src="/sama-scan-logo.png" width={180} height={180} alt="مركز سما سكان للأشعة" priority />
    <span className="eyebrow">SAMA SCAN · CONTROL CENTER</span>
    <h1>كل أداء المركز<br />في مكان واحد</h1>
    <p>تابع الملف التجاري والموقع، فرص التحسين والتواصل، وأدِر منشورات المركز عبر القنوات المتصلة.</p>
    {error && <p className="auth-error" role="alert">لم يكتمل تسجيل الدخول. استخدم حساب Windsor.ai الخاص بإدارة المركز، ثم حاول مرة أخرى.</p>}
    <a className="button primary" href="/api/dashboard/oauth/start">تسجيل الدخول بحساب الإدارة ←</a>
    <small>دخول خاص بإدارة سما سكان عبر Windsor.ai</small>
    <Link className="auth-back" href="/">العودة لموقع المركز</Link>
  </section></main>;
}
