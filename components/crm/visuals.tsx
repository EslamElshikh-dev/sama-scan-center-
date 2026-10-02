"use client";
import Image from "next/image";
import { ArrowUpLeft, CalendarDays, ChevronLeft, ClipboardList, Clock3, ContactRound, ListChecks, Plus, UserRoundPlus, UsersRound, type LucideIcon } from "lucide-react";
import type { CRMView, Entity, Summary } from "@/lib/crm/types";

export function CRMWelcome({onAdd,summary,onReview}:{onAdd:(entity:Entity)=>void;summary:Summary|null;onReview:()=>void}) {
  return <section className="crm-hero studio-welcome care-workday">
    <div className="care-workday-copy"><div className="care-workday-brand"><span className="care-workday-logo"><Image src="/sama-scan-logo.png" alt="" width={52} height={52}/></span><span>سما سكان <small>مساحة العمل اليومية</small></span></div><h2>يوم منظّم.<br/><em>عناية أقرب.</em></h2><p>الطلبات والمواعيد والمتابعات، أمامك في مكان واحد.</p><div className="crm-hero-actions"><button className="button light" onClick={()=>onAdd("inquiries")}><Plus size={18}/><span>طلب حجز جديد</span></button><button className="crm-hero-secondary" onClick={()=>onAdd("contacts")}><UserRoundPlus size={18}/> إضافة جهة اتصال</button></div></div>
    <div className="care-workday-priority"><span className="care-priority-label"><ListChecks size={19}/> الأولوية الآن</span><strong>{summary ? summary.needsFollowup.toLocaleString("ar-SA") : "—"}</strong><p>طلبات مفتوحة تحتاج متابعة</p><button type="button" onClick={onReview}>مراجعة الطلبات <ChevronLeft size={18}/></button><small>حسب المتابعات المرتبطة بكل طلب</small></div>
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
  return <div className="crm-empty studio-empty"><span className="care-empty-icon" aria-hidden="true"><Icon size={30}/></span><h3>{title}</h3><p>{text}</p>{onAdd&&<button className="button outline" onClick={onAdd}><Plus size={15}/> إضافة الآن</button>}</div>;
}
export function QuickCreate({onAdd}:{onAdd:(entity:Entity)=>void}) {
  return <div className="studio-quick-create"><div className="studio-quick-create-label"><span><Plus size={19}/></span><div><strong>خطوتك التالية</strong><small>ابدأ من مكان واحد</small></div></div>{[
    {entity:"contacts" as const,label:"جهة اتصال",description:"علاقة جديدة للمركز",icon:UserRoundPlus,tone:"blue"},
    {entity:"appointments" as const,label:"موعد جديد",description:"نظّم وقت الفحص",icon:CalendarDays,tone:"teal"},
    {entity:"tasks" as const,label:"مهمة متابعة",description:"خلّي كل خطوة واضحة",icon:ListChecks,tone:"gold"},
  ].map(a=><button className={`nav-tone-${a.tone}`} type="button" key={a.entity} onClick={()=>onAdd(a.entity)}><span className="studio-quick-icon"><a.icon size={20}/></span><span><strong>{a.label}</strong><small>{a.description}</small></span><ArrowUpLeft size={16}/></button>)}</div>;
}
