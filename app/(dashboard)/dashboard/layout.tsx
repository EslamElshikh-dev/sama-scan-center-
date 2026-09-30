import type { Metadata } from "next";
import "./dashboard.css";
export const metadata: Metadata = { metadataBase: new URL("https://samascan.vercel.app"), title: "لوحة إدارة سما سكان", description: "لوحة الأداء والقنوات لمركز سما سكان للأشعة", robots: { index: false, follow: false }, icons: { icon: "/sama-scan-icon.png" } };
export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <html lang="ar" dir="rtl"><body>{children}</body></html>; }
