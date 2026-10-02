"use client";
import {useState} from "react";
import {Check,LoaderCircle} from "lucide-react";
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {crmRequest} from "@/lib/crm/client";
import {localInput,type User} from "@/lib/crm/types";
import {institutionKinds,visitOutcomes,type Physician,type PhysicianVisit,type ReferralStaff} from "@/lib/crm/referrals";
import {PhysicianPicker} from "./physician-picker";

type CommonProps={user:User;staff:ReferralStaff[];onClose:()=>void;onSaved:()=>void};
function OwnerField({value,onChange,user,staff,optional=false}:{value:string;onChange:(value:string)=>void;user:User;staff:ReferralStaff[];optional?:boolean}){
 return <label className="crm-field"><span>مسؤول العلاقة {optional&&"· اختياري"}</span><select value={value} onChange={e=>onChange(e.target.value)} required={!optional} disabled={user.role==="marketing"}>{optional&&<option value="">غير معيّن</option>}{staff.map(s=><option key={s.username} value={s.username}>{s.display_name}</option>)}</select></label>;
}
function Actions({busy,onClose}:{busy:boolean;onClose:()=>void}){return <div className="crm-dialog-actions crm-full"><button className="button primary" disabled={busy} type="submit">{busy?<LoaderCircle className="crm-spin" size={17}/>:<Check size={17}/>} {busy?"جارٍ الحفظ…":"حفظ البيانات"}</button><button className="button outline" type="button" disabled={busy} onClick={onClose}>إلغاء</button></div>;}
export function PhysicianEditor({record,user,staff,onClose,onSaved}:CommonProps&{record:Physician}){
 const [form,setForm]=useState(()=>({...record,owner:user.role==="marketing"?user.username:record.owner}));
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const field=<K extends keyof Physician>(key:K,value:Physician[K])=>setForm(f=>({...f,[key]:value}));
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");try{await crmRequest("physician_save",form);onSaved();}catch(e){setError(e instanceof Error?e.message:"تعذّر الحفظ.");}finally{setBusy(false);}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent dir="rtl" className="crm-dialog"><DialogHeader><span className="eyebrow">SAMA SCAN · PHYSICIANS</span><DialogTitle>{record.version?"تعديل ملف الطبيب":"إضافة طبيب محوِّل"}</DialogTitle><DialogDescription>بيانات الطبيب المهنية، جهة عمله، والمسؤول عن التواصل معه.</DialogDescription></DialogHeader>
 <form className="crm-form" onSubmit={submit}>
 <label className="crm-field"><span>اسم الطبيب *</span><input required minLength={2} maxLength={100} value={form.name} onChange={e=>field("name",e.target.value)}/></label>
 <label className="crm-field"><span>التخصص *</span><input required minLength={2} maxLength={100} value={form.specialty} onChange={e=>field("specialty",e.target.value)} placeholder="مثل: عظام أو نساء وولادة"/></label>
 <label className="crm-field"><span>العيادة / المستشفى *</span><input required minLength={2} maxLength={150} value={form.institution} onChange={e=>field("institution",e.target.value)}/></label>
 <label className="crm-field"><span>نوع الجهة</span><select value={form.institution_kind} onChange={e=>field("institution_kind",e.target.value as Physician["institution_kind"])}>{Object.entries(institutionKinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label className="crm-field"><span>الحي / المنطقة</span><input maxLength={100} value={form.district} onChange={e=>field("district",e.target.value)}/></label>
 <label className="crm-field"><span>هاتف التواصل المهني</span><input type="tel" dir="ltr" maxLength={20} value={form.phone||""} onChange={e=>field("phone",e.target.value)} placeholder="05xxxxxxxx"/></label>
 <OwnerField value={form.owner||""} user={user} staff={staff} optional={user.role==="admin"} onChange={v=>field("owner",v||null)}/>
 {record.version>0&&<label className="crm-field"><span>حالة الملف</span><select value={form.active?"active":"archived"} onChange={e=>field("active",e.target.value==="active")}><option value="active">نشط</option><option value="archived">مؤرشف</option></select></label>}
 <label className="crm-field crm-full"><span>ملاحظات العلاقة المهنية</span><textarea rows={3} maxLength={1000} value={form.note} onChange={e=>field("note",e.target.value)} placeholder="أفضل وقت للتواصل، الشخص المسؤول، أو الخطوة القادمة"/></label>
 {record.version>0&&!form.active&&<p className="crm-muted crm-full">تحتفظ الأرشفة بالزيارات والإحالات السابقة وتوقف الربط الجديد بهذا الطبيب.</p>}
 {error&&<div className="crm-error crm-full" role="alert">{error}</div>}<Actions busy={busy} onClose={onClose}/>
 </form></DialogContent></Dialog>;
}

export function VisitEditor({record,user,staff,onClose,onSaved}:CommonProps&{record:PhysicianVisit}){
 const [form,setForm]=useState(record);const [visited,setVisited]=useState(()=>localInput(record.visited_at));
 const [followup,setFollowup]=useState(()=>record.next_followup_at?localInput(record.next_followup_at):"");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  if(!form.physician_id){setError("اختر الطبيب قبل تسجيل الزيارة.");return;}
  const visitedAt=new Date(visited+":00+03:00");const next=followup?new Date(followup+":00+03:00"):null;
  if(visitedAt.getTime()>Date.now()){setError("سجّل زيارة تمت بالفعل. موعد المتابعة يمكن أن يكون لاحقًا.");return;}
  if(next&&next<=visitedAt){setError("موعد المتابعة يجب أن يكون بعد الزيارة.");return;}
  setBusy(true);try{await crmRequest("visit_save",{...form,visited_at:visitedAt.toISOString(),next_followup_at:next?.toISOString()||null,followup_status:next?(form.followup_status==="done"?"done":"open"):"not_needed"});onSaved();}catch(e){setError(e instanceof Error?e.message:"تعذّر الحفظ.");}finally{setBusy(false);}
 }
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent dir="rtl" className="crm-dialog"><DialogHeader><span className="eyebrow">SAMA SCAN · FIELD VISITS</span><DialogTitle>{record.version?"تعديل زيارة ومتابعتها":"تسجيل زيارة للطبيب"}</DialogTitle><DialogDescription>دوّن الزيارة الفعلية، نتيجتها، وموعد الخطوة القادمة بتوقيت الرياض.</DialogDescription></DialogHeader>
 <form className="crm-form" onSubmit={submit}>
 <PhysicianPicker value={form.physician_id} label={form.physician_name} disabled={record.version>0} onChange={d=>setForm(f=>({...f,physician_id:d?.id||"",physician_name:d?.name}))}/>
 <label className="crm-field"><span>تاريخ الزيارة ووقتها *</span><input type="datetime-local" required value={visited} max={localInput()} onChange={e=>setVisited(e.target.value)}/></label>
 <OwnerField value={form.owner} user={user} staff={staff} onChange={v=>setForm(f=>({...f,owner:v}))}/>
 <label className="crm-field"><span>نتيجة الزيارة *</span><select value={form.outcome} onChange={e=>setForm(f=>({...f,outcome:e.target.value as PhysicianVisit["outcome"]}))}>{Object.entries(visitOutcomes).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label className="crm-field"><span>موعد المتابعة القادمة · اختياري</span><input type="datetime-local" value={followup} onChange={e=>setFollowup(e.target.value)}/></label>
 {followup&&<label className="crm-field"><span>حالة المتابعة</span><select value={form.followup_status==="done"?"done":"open"} onChange={e=>setForm(f=>({...f,followup_status:e.target.value as PhysicianVisit["followup_status"]}))}><option value="open">بانتظار المتابعة</option><option value="done">تمت المتابعة</option></select></label>}
 <label className="crm-field crm-full"><span>ما دار في الزيارة والنتيجة</span><textarea rows={4} maxLength={1000} value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="المواد المقدمة، طلبات الطبيب، وما اتُفق على متابعته"/></label>
 {error&&<div className="crm-error crm-full" role="alert">{error}</div>}<Actions busy={busy} onClose={onClose}/>
 </form></DialogContent></Dialog>;
}
