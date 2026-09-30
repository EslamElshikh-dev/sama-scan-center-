"use client";
import { useState } from "react";
import { ArrowUpLeft, BarChart3, CalendarDays, ChartNoAxesCombined, ChevronLeft, ClipboardList, ContactRound, Globe2, LayoutDashboard, ListChecks, LockKeyhole, MapPin, Megaphone, MessageCircle, MoreHorizontal, Search, Send, Sparkles, UsersRound, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import type { Role } from "@/lib/crm/types";

export const dashboardNavigation = [
  { id: "today", title: "مركز العمل", short: "الرئيسية", description: "ملخص يومك ومواعيدك ومتابعات فريقك", icon: LayoutDashboard, tone: "teal" },
  { id: "contacts", title: "جهات الاتصال", short: "العملاء", description: "بيانات التواصل وسجل العلاقة مع المركز", icon: ContactRound, tone: "blue" },
  { id: "inquiries", title: "طلبات الحجز", short: "الطلبات", description: "رحلة الاستفسار من التواصل إلى الحجز", icon: ClipboardList, tone: "violet" },
  { id: "appointments", title: "المواعيد", short: "المواعيد", description: "جدول الفحوصات وتنظيم حضور المراجعين", icon: CalendarDays, tone: "teal" },
  { id: "followups", title: "المتابعات والمهام", short: "المتابعات", description: "مهام الاستقبال وتوزيع المسؤوليات", icon: ListChecks, tone: "gold" },
  { id: "crmreports", title: "تقارير CRM", short: "التقارير", description: "مصادر التواصل ومعدلات الحجز والحضور", icon: ChartNoAxesCombined, tone: "blue" },
  { id: "team", title: "الفريق والصلاحيات", short: "الفريق", description: "حسابات الموظفين وصلاحياتهم وسجل العمليات", icon: LockKeyhole, tone: "slate" },
  { id: "overview", title: "ملخص التسويق", short: "الأداء", description: "نظرة تجمع الأداء الرقمي وفرص النمو", icon: BarChart3, tone: "teal" },
  { id: "google", title: "الملف التجاري", short: "Google", description: "تفاعل Google والاتصالات والاتجاهات", icon: MapPin, tone: "green" },
  { id: "website", title: "أداء الموقع", short: "الموقع", description: "الظهور والنقرات في نتائج البحث", icon: Globe2, tone: "blue" },
  { id: "ads", title: "قياس الإعلانات", short: "الإعلانات", description: "تخطيط الحملات وأهداف الميزانية والتواصل", icon: Megaphone, tone: "gold" },
  { id: "competitors", title: "مشهد المنافسة", short: "المنافسون", description: "الخدمات وطريقة عرضها لدى جهات المقارنة", icon: UsersRound, tone: "violet" },
  { id: "improvements", title: "فرص التحسين", short: "التحسين", description: "أولويات عملية لتطوير حضور المركز", icon: Sparkles, tone: "gold" },
  { id: "publisher", title: "النشر الجماعي", short: "المحتوى", description: "إعداد المنشورات ومعاينة توزيع المحتوى", icon: Send, tone: "coral" },
  { id: "channels", title: "قنوات المركز", short: "القنوات", description: "مساحة القنوات الاجتماعية ومصادر الأداء", icon: MessageCircle, tone: "teal" },
] as const;
export type DashboardView = typeof dashboardNavigation[number]["id"];
export const crmViews: readonly string[] = ["today", "contacts", "inquiries", "appointments", "followups", "crmreports", "team"];
export const canView = (role:Role,id:string) => role === "admin" || (role === "marketing" ? !crmViews.includes(id) : crmViews.includes(id) && id !== "team");
const groups = [
  { label: "إدارة المركز", caption: "WORKSPACE", ids: ["today", "contacts", "inquiries", "appointments", "followups", "crmreports"] },
  { label: "الأداء والنمو", caption: "GROWTH", ids: ["overview", "google", "website", "ads", "competitors"] },
  { label: "المحتوى والتحسين", caption: "CONTENT", ids: ["improvements", "publisher", "channels"] },
  { label: "إدارة النظام", caption: "ADMIN", ids: ["team"] },
];
const normalize = (s:string) => s.toLowerCase().replace(/[أإآ]/g,"ا").replace(/[\u064B-\u065F]/g,"").trim();
type NavigationProps = {view:DashboardView;role:Role;onSelect:(view:DashboardView)=>void};

export function DashboardNavigation({view,role,onSelect}:NavigationProps) {
  const {setOpenMobile}=useSidebar();
  return <nav className="studio-navigation" aria-label="أقسام لوحة التحكم">{groups.map(group=>{
    const items=dashboardNavigation.filter(n=>group.ids.includes(n.id)&&canView(role,n.id));
    if(!items.length)return null;
    return <div className="sidebar-group" key={group.caption}><div className="sidebar-caption"><span>{group.label}</span><small>{group.caption}</small></div><SidebarMenu className="nav-menu">{items.map(n=><SidebarMenuItem key={n.id}><SidebarMenuButton title={n.description} aria-current={view===n.id?"page":undefined} isActive={view===n.id} onClick={()=>{onSelect(n.id);setOpenMobile(false);}} className={`nav-item nav-tone-${n.tone} ${n.id==="today"||n.id==="overview"?"nav-overview":""}`}><span className="nav-icon"><n.icon/></span><span className="nav-label">{n.title}</span><ChevronLeft className="nav-chevron" size={14}/>{view===n.id&&<span className="nav-active-marker" aria-hidden="true"/>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></div>;
  })}</nav>;
}
export function MobileDock({view,role,onSelect}:NavigationProps) {
  const {setOpenMobile,openMobile}=useSidebar();
  const ids=role==="marketing"?["overview","google","website","publisher"]:["today","appointments","inquiries","followups"];
  return <nav className="studio-mobile-dock" aria-label="التنقل السريع للجوال">{ids.map(id=>{const n=dashboardNavigation.find(n=>n.id===id)!;return <button type="button" key={id} aria-current={view===id?"page":undefined} className={view===id?"is-active":""} onClick={()=>onSelect(n.id)}><span><n.icon size={20}/></span><small>{n.short}</small></button>;})}<button type="button" onClick={()=>setOpenMobile(true)} aria-label="عرض كل الأقسام" aria-expanded={openMobile}><span><MoreHorizontal size={21}/></span><small>المزيد</small></button></nav>;
}
export function SectionRoutes({view,role,onSelect}:NavigationProps) {
  const ids=crmViews.includes(view)?["today","contacts","inquiries","appointments","followups","crmreports","team"]:["overview","google","website","ads","competitors","improvements","publisher","channels"];
  return <nav className="studio-section-routes" aria-label="المسارات المرتبطة بالقسم"><span className="studio-route-label">مساراتك</span><div>{dashboardNavigation.filter(n=>ids.includes(n.id)&&canView(role,n.id)).map(n=><button key={n.id} type="button" aria-current={n.id===view?"page":undefined} onClick={()=>onSelect(n.id)} className={n.id===view?"is-active":""}><n.icon size={15}/><span>{n.short}</span></button>)}</div></nav>;
}
export function RoutePalette({role,onClose,onSelect}:{role:Role;onClose:()=>void;onSelect:(view:DashboardView)=>void}) {
  const [search,setSearch]=useState("");
  const results=dashboardNavigation.filter(n=>canView(role,n.id)&&normalize(`${n.title} ${n.description} ${n.id}`).includes(normalize(search)));
  function select(id:DashboardView){onSelect(id);onClose();}
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="studio-palette" dir="rtl"><DialogHeader><DialogTitle>كل مساراتك، أقرب.</DialogTitle><DialogDescription>ابحث عن القسم الذي تحتاجه وانتقل إليه مباشرة.</DialogDescription></DialogHeader><div className="studio-palette-search"><Search size={21}/><input aria-label="البحث عن قسم" placeholder="المواعيد، العملاء، التقارير…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&results[0]){e.preventDefault();select(results[0].id);}}}/>{search?<button aria-label="مسح البحث" type="button" onClick={()=>setSearch("")}><X size={17}/></button>:<kbd>↵</kbd>}</div><div className="studio-palette-results" aria-label="نتائج البحث">{results.map(n=><button type="button" key={n.id} onClick={()=>select(n.id)} className={`nav-tone-${n.tone}`}><span className="studio-result-icon"><n.icon size={21}/></span><span><strong>{n.title}</strong><small>{n.description}</small></span><ArrowUpLeft size={18}/></button>)}{results.length===0&&<p className="studio-palette-empty">لا يوجد قسم بهذا الاسم. جرّب كلمة أخرى.</p>}</div><div className="studio-palette-footer"><span>{results.length} مسار متاح</span><span><kbd>Esc</kbd> للإغلاق</span></div></DialogContent></Dialog>;
}
