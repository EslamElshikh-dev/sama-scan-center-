import type { Metadata } from "next";
import "./dashboard.css";
import "./crm.css";
import "./referrals.css";
import "./studio.css";
import "./care.css";
import "./followup.css";
export const metadata: Metadata = { metadataBase: new URL("https://samascan.vercel.app"), title: "Sama Scan CRM | إدارة سما سكان", description: "إدارة علاقات العملاء والحجوزات والمواعيد لمركز سما سكان للأشعة", robots: { index: false, follow: false }, icons: { icon: "/sama-scan-icon.png" } };
export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <html lang="ar" dir="rtl"><body>{children}</body></html>; }
