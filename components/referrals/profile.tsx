"use client";
import {useEffect,useState} from "react";
import {CalendarDays,Clock3,MessageCircle,Pencil,Phone,Plus,Stethoscope} from "lucide-react";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {crmRequest} from "@/lib/crm/client";
import {displayDate,type User} from "@/lib/crm/types";
import {canEditPhysician,canEditVisit,institutionKinds,visitOutcomes,type Physician,type PhysicianDetail,type PhysicianVisit,type ReferralStaff} from "@/lib/crm/referrals";
import {ReferralLoading} from "./ui";

export function PhysicianProfile({id,user,onClose,onEdit,onVisit,onEditVisit}:{id:string;user:User;onClose:()=>void;onEdit:(doctor:Physician,staff:ReferralStaff[])=>void;onVisit:(doctor:Physician,staff:ReferralStaff[])=>void;onEditVisit:(visit:PhysicianVisit,staff:ReferralStaff[])=>void}){
 const [now]=useState(()=>Date.now());const [detail,setDetail]=useState<PhysicianDetail|null>(null);const [staff,setStaff]=useState<ReferralStaff[]>([]);const [error,setError]=useState("");
 useEffect(()=>{const c=new AbortController();crmRequest<{data:PhysicianDetail;staff:ReferralStaff[]}>("physician_detail",{id},c.signal).then(r=>{setDetail(r.data);setStaff(r.staff);}).catch(e=>{if(e.name!=="AbortError")setError(e.message);});return()=>c.abort();},[id]);
 const owner=(name:string|null)=>staff.find(s=>s.username===name)?.display_name||name||"غير معيّن";
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent dir="rtl" className="crm-dialog referral-profile"><DialogHeader><DialogTitle>ملف الطبيب المحوِّل</DialogTitle><DialogDescription>العلاقة المهنية والزيارات ونتائج الإحالات الإجمالية.</DialogDescription></DialogHeader>
 {error?<p className="crm-error" role="alert">{error}</p>:!detail?<ReferralLoading/>:<>
 <div className="crm-profile-hero"><span className="crm-avatar"><Stethoscope size={24}/></span><div><h2>{detail.physician.name}</h2><p>{detail.physician.specialty} · {detail.physician.institution}</p><small>{institutionKinds[detail.physician.institution_kind]}{detail.physician.district&&" · "+detail.physician.district} · {detail.physician.active?"نشط":"مؤرشف"}</small></div>{detail.physician.phone&&<div className="crm-phone-actions"><a href={"tel:"+detail.physician.phone} aria-label="اتصال بالطبيب"><Phone size={17}/></a><a href={"https://wa.me/"+detail.physician.phone.replace(/\D/g,"")} target="_blank" rel="noreferrer" aria-label="فتح واتساب الطبيب"><MessageCircle size={17}/></a></div>}</div>
 <p className="crm-muted">مسؤول العلاقة: {owner(detail.physician.owner)}{detail.physician.phone&&<> · <span dir="ltr">{detail.physician.phone}</span></>}</p>
 <div className="crm-profile-totals">{[["إحالات",detail.stats.referrals],["لها حجز",detail.stats.booked],["انتهت بحضور",detail.stats.attended],["أُجري فحصها",detail.stats.completed]].map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}<div><strong><CalendarDays size={21}/></strong><span>آخر إحالة: {displayDate(detail.stats.last_referral_at||undefined,false)}</span></div></div>
 <p className="crm-muted">منذ بدء التسجيل. يُحسب كل طلب مرة واحدة في الحجز والحضور وإجراء الفحص.</p>
 <div className="crm-profile-actions">{canEditPhysician(user,detail.physician)&&<button className="button outline" onClick={()=>onEdit(detail.physician,staff)}><Pencil size={15}/> تعديل الملف</button>}{detail.physician.active&&<button className="button primary" onClick={()=>onVisit(detail.physician,staff)}><Plus size={15}/> تسجيل زيارة</button>}</div>
 {detail.physician.note&&<p className="crm-profile-note">{detail.physician.note}</p>}
 <section><h3>سجل الزيارات والمتابعات</h3><ol className="crm-customer-timeline">{detail.visits.map(v=><li key={v.id}><time>{displayDate(v.visited_at)} · {owner(v.owner)}</time><strong>{visitOutcomes[v.outcome]}</strong>{v.note&&<p className="referral-note">{v.note}</p>}{v.next_followup_at&&<small className={v.followup_status==="open"&&Date.parse(v.next_followup_at)<now?"referral-overdue":""}><Clock3 size={13}/> {v.followup_status==="done"?"متابعة مكتملة":"موعد المتابعة"} · {displayDate(v.next_followup_at)}</small>}{canEditVisit(user,v)&&<button className="crm-edit" onClick={()=>onEditVisit({...v,physician_name:detail.physician.name},staff)}><Pencil size={14}/> تحديث الزيارة</button>}</li>)}</ol>{!detail.visits.length&&<p className="crm-muted">لم تُسجّل زيارات لهذا الطبيب بعد.</p>}<p className="crm-muted">يعرض أحدث 50 زيارة. يمكن استعراض كل السجلات من قسم زيارات الأطباء.</p></section>
 </>}
 </DialogContent></Dialog>;
}
