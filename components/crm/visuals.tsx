"use client";
import Image from "next/image";
import { ArrowLeft, ArrowUpLeft, CalendarDays, ChevronLeft, ClipboardList, Clock3, ContactRound, HeartPulse, ListChecks, Plus, Sparkles, UserRoundPlus, UsersRound, type LucideIcon } from "lucide-react";
import type { CRMView, Entity, Summary } from "@/lib/crm/types";

export function CRMWelcome({onAdd}:{onAdd:(entity:Entity)=>void}) {
  return <section className="crm-hero studio-welcome">
    <div className="studio-welcome-copy"><span className="crm-hero-kicker"><span><Sparkles size={14}/></span> SAMA SCAN · EVERY CONNECTION MATTERS</span><h2>عناية تبدأ بالتواصل،<br/><em>وتكتمل بالمتابعة.</em></h2><p>كل استفسار له مسار، وكل موعد له اهتمام.<br className="studio-desktop-break"/> رتّب يوم المركز، وخلي فريقك أقرب لكل مراجع.</p><div className="crm-hero-actions"><button className="button light" onClick={()=>onAdd("inquiries")}><Plus size={18}/><span>طلب حجز جديد</span><ArrowLeft size={16}/></button><button className="crm-hero-secondary" onClick={()=>onAdd("contacts")}><UserRoundPlus size={18}/> إضافة جهة اتصال</button></div><div className="studio-welcome-footnote"><span><i/> تواصل</span><span><i/> تنظيم</span><span><i/> متابعة</span></div></div>
    <div className="studio-care-visual" aria-hidden="true"><div className="studio-care-orbit orbit-outer"/><div className="studio-care-orbit orbit-inner"/><div className="studio-care-glow"/><div className="studio-care-line line-top"/><div className="studio-care-line line-bottom"/><div className="studio-care-card card-back"/><div className="studio-care-card card-front"><span className="studio-care-caption">CARE IN FOCUS</span><span className="studio-care-logo"><Image src="/sama-scan-logo.png" alt="" width={120} height={120}/></span><strong>سما سكان</strong><small>صورة أوضح. عناية أقرب.</small><div className="studio-care-pulse"><HeartPulse size={18}/><span/><span/><span/></div></div><span className="studio-care-node care-node-contact"><ContactRound size={20}/><span>تواصل أقرب<small>كل علاقة، لها اهتمام</small></span></span><span className="studio-care-node care-node-calendar"><CalendarDays size={20}/><span>يوم منظّم<small>كل موعد، في مكانه</small></span></span><span className="studio-care-spark spark-one"/><span className="studio-care-spark spark-two"/></div>
  </section>;
}
export function CRMStats({summary,onNavigate}:{summary:Summary;onNavigate:(view:CRMView)=>void}) {
  const stats=[
    {label:"مواعيد اليوم",value:summary.appointmentsToday,detail:"مواعيد المركز بتوقيت الرياض",icon:CalendarDays,tone:"teal",view:"appointments" as const,caption:"جدول اليوم",cta:"استعرض المواعيد"},
    {label:"طلبات جديدة اليوم",value:summary.newToday,detail:`${summary.openInquiries} طلبًا بانتظار إتمام الحجز`,icon:ContactRound,tone:"blue",view:"inquiries" as const,caption:"التواصل والحجز",cta:"تابع الطلبات"},
    {label:"متابعات متأخرة",value:summary.overdueTasks,detail:`${summary.openTasks} مهمة مفتوحة إجمالًا`,icon:Clock3,tone:"amber",view:"followups" as const,caption:"أولويات الفريق",cta:"راجع المتابعات"},
    {label:"جهات اتصال نشطة",value:summary.contacts,detail:"قاعدة علاقات المركز",icon:UsersRound,tone:"purple",view:"contacts" as const,caption:"علاقات المركز",cta:"افتح جهات الاتصال"},
  ];
  return <div className="crm-stats studio-stats">{stats.map((s,index)=><button type="button" className={`crm-stat crm-tone-${s.tone}`} key={s.label} onClick={()=>onNavigate(s.view)} style={{"--reveal-delay":`${index*55}ms`} as React.CSSProperties}><div className="studio-stat-top"><span className="studio-stat-caption">{s.caption}</span><span className="studio-stat-icon"><s.icon size={21}/></span></div><span className="studio-stat-label">{s.label}</span><strong>{s.value.toLocaleString("en-US")}</strong><p>{s.detail}</p><span className="studio-stat-footer"><span>{s.cta}</span><ArrowUpLeft size={16}/></span><span className="studio-stat-orbit" aria-hidden="true"/></button>)}</div>;
}
export function CRMEmpty({title="لسه مفيش سجلات",text="ابدأ بإضافة أول سجل، وهتظهر تفاصيله هنا.",onAdd,icon:Icon=ClipboardList}:{title?:string;text?:string;onAdd?:()=>void;icon?:LucideIcon}) {
  return <div className="crm-empty studio-empty"><div className="studio-empty-art" aria-hidden="true"><span className="studio-empty-sheet sheet-back"/><span className="studio-empty-sheet sheet-front"><Icon size={28}/><i/><i/></span><span className="studio-empty-plus"><Plus size={13}/></span><i className="studio-empty-dot"/></div><h3>{title}</h3><p>{text}</p>{onAdd&&<button className="button outline" onClick={onAdd}><Plus size={15}/> إضافة الآن <ChevronLeft size={14}/></button>}</div>;
}
export function QuickCreate({onAdd}:{onAdd:(entity:Entity)=>void}) {
  return <div className="studio-quick-create"><div className="studio-quick-create-label"><span><Plus size={19}/></span><div><strong>خطوتك التالية</strong><small>ابدأ من مكان واحد</small></div></div>{[
    {entity:"contacts" as const,label:"جهة اتصال",description:"علاقة جديدة للمركز",icon:UserRoundPlus,tone:"blue"},
    {entity:"appointments" as const,label:"موعد جديد",description:"نظّم وقت الفحص",icon:CalendarDays,tone:"teal"},
    {entity:"tasks" as const,label:"مهمة متابعة",description:"خلّي كل خطوة واضحة",icon:ListChecks,tone:"gold"},
  ].map(a=><button className={`nav-tone-${a.tone}`} type="button" key={a.entity} onClick={()=>onAdd(a.entity)}><span className="studio-quick-icon"><a.icon size={20}/></span><span><strong>{a.label}</strong><small>{a.description}</small></span><ArrowUpLeft size={16}/></button>)}</div>;
}
