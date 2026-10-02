"use client";
import {useEffect,useState} from "react";
import {CalendarDays,Check,ChevronLeft,Clock3,MapPin,Pencil,Plus,RefreshCw,Search,Stethoscope,UserRound} from "lucide-react";
import {crmRequest} from "@/lib/crm/client";
import {displayDate,type User} from "@/lib/crm/types";
import {canEditPhysician,canEditVisit,visitOutcomes,type Physician,type PhysicianVisit,type ReferralStaff,type ReferralView} from "@/lib/crm/referrals";
import {PhysicianEditor,VisitEditor} from "./forms";
import {PhysicianProfile} from "./profile";
import {PhysicianOutcomeReport} from "./report";
import {ReferralEmpty,ReferralLoading,ReferralPagination} from "./ui";

export default function ReferralsWorkspace({view,user}:{view:ReferralView;user:User}){
 const [doctors,setDoctors]=useState<Physician[]>([]);const [visits,setVisits]=useState<PhysicianVisit[]>([]);const [staff,setStaff]=useState<ReferralStaff[]>([]);
 const [search,setSearch]=useState("");const [query,setQuery]=useState("");const [filter,setFilter]=useState("");const [page,setPage]=useState(1);const [total,setTotal]=useState(0);
 const [revision,setRevision]=useState(0);const [loadedKey,setLoadedKey]=useState("");const [now,setNow]=useState(()=>Date.now());const [error,setError]=useState("");const [toast,setToast]=useState("");
 const [doctorEditor,setDoctorEditor]=useState<Physician|null>(null);const [visitEditor,setVisitEditor]=useState<PhysicianVisit|null>(null);const [profileId,setProfileId]=useState<string|null>(null);
 const [saving,setSaving]=useState<string|null>(null);
 const requestKey=JSON.stringify([view,query,filter,page,revision]);const loading=loadedKey!==requestKey;
 useEffect(()=>{const t=setTimeout(()=>{setQuery(search);setPage(1);},250);return()=>clearTimeout(t);},[search]);
 useEffect(()=>{const t=setInterval(()=>{setNow(Date.now());setRevision(v=>v+1);},60000);return()=>clearInterval(t);},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),5000);return()=>clearTimeout(t);},[toast]);
 useEffect(()=>{
  if(view==="physicianreports")return;
  const c=new AbortController();
  if(view==="physicians")crmRequest<{rows:Physician[];staff:ReferralStaff[];total:number}>("physician_list",{search:query,status:filter,page},c.signal).then(r=>{if(c.signal.aborted)return;setDoctors(r.rows);setStaff(r.staff);setTotal(r.total);setError("");setLoadedKey(requestKey);}).catch(e=>{if(!c.signal.aborted){setError(e.message);setLoadedKey(requestKey);}});
  else crmRequest<{rows:PhysicianVisit[];staff:ReferralStaff[];total:number}>("visit_list",{search:query,status:filter,page},c.signal).then(r=>{if(c.signal.aborted)return;setVisits(r.rows);setStaff(r.staff);setTotal(r.total);setError("");setLoadedKey(requestKey);}).catch(e=>{if(!c.signal.aborted){setError(e.message);setLoadedKey(requestKey);}});
  return()=>c.abort();
 },[view,query,filter,page,requestKey]);
 const owner=(name:string|null)=>staff.find(s=>s.username===name)?.display_name||name||"غير معيّن";
 const saved=()=>{setDoctorEditor(null);setVisitEditor(null);setRevision(v=>v+1);setToast("تم الحفظ بنجاح");};
 function addDoctor(){setDoctorEditor({id:crypto.randomUUID(),version:0,name:"",specialty:"",institution:"",institution_kind:"clinic",district:"",phone:null,owner:user.username,active:true,note:""});}
 function addVisit(d?:Physician){setVisitEditor({id:crypto.randomUUID(),version:0,physician_id:d?.id||"",physician_name:d?.name,visited_at:new Date().toISOString(),owner:user.username,outcome:"interested",note:"",next_followup_at:null,followup_status:"not_needed"});}
 async function completeVisit(v:PhysicianVisit){setSaving(v.id);setError("");try{await crmRequest("visit_save",{...v,followup_status:"done"});setRevision(x=>x+1);setToast("تمت متابعة الطبيب");}catch(e){setError(e instanceof Error?e.message:"تعذّر حفظ المتابعة.");}finally{setSaving(null);}}
 return <div className="crm-workspace referral-workspace">
 <div className="crm-contextbar"><span><i/>علاقات الأطباء · بيانات المركز المسجّلة</span><button className="crm-refresh" onClick={()=>setRevision(v=>v+1)}><RefreshCw size={14}/> تحديث</button></div>
 {view==="physicianreports"?<PhysicianOutcomeReport revision={revision} onOpen={setProfileId}/>:<>
 <div className="crm-records-heading"><div><span className="crm-section-kicker">PHYSICIAN RELATIONSHIPS</span><h2>{view==="physicians"?"الأطباء المحوِّلون":"زيارات الأطباء والمتابعة"}</h2><p>{view==="physicians"?"ملف لكل طبيب، جهة عمل واضحة، وخطوة تواصل قادمة.":"سجّل الزيارة ونتيجتها، ثم تابع ما اتفقت عليه مع الطبيب."}</p></div><button className="button primary" disabled={loading||!staff.length} onClick={()=>view==="physicians"?addDoctor():addVisit()}><Plus size={17}/>{view==="physicians"?"إضافة طبيب":"تسجيل زيارة"}</button></div>
 <div className="crm-toolbar"><div className="crm-search"><Search size={17}/><input aria-label={view==="physicians"?"بحث عن طبيب":"بحث في زيارات الأطباء"} value={search} onChange={e=>setSearch(e.target.value)} maxLength={100} placeholder="ابحث باسم الطبيب أو الجهة…"/></div><select aria-label="تصفية سجلات الأطباء" value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}><option value="">كل السجلات</option>{view==="physicians"?<><option value="active">أطباء نشطون</option><option value="overdue">متابعة متأخرة</option><option value="archived">ملفات مؤرشفة</option></>:<><option value="mine">زياراتي</option><option value="open">بانتظار المتابعة</option><option value="overdue">متابعات متأخرة</option><option value="done">متابعات مكتملة</option></>}</select></div>
 {!loading&&error&&<p className="crm-error" role="alert">{error}</p>}
 {loading?<ReferralLoading/>:error?null:!(view==="physicians"?doctors:visits).length?<ReferralEmpty filtered={Boolean(query||filter)}/>:view==="physicians"?<div className="referral-doctors">{doctors.map(d=><article className={"panel referral-doctor "+(!d.active?"is-archived":"")} key={d.id}>
 <div className="referral-doctor-head"><span className="referral-doctor-icon"><Stethoscope size={23}/></span><div><button onClick={()=>setProfileId(d.id)}>{d.name}</button><p>{d.specialty}</p></div><span className={"crm-badge crm-"+(d.active?"attended":"cancelled")}>{d.active?"نشط":"مؤرشف"}</span></div>
 <div className="referral-institution"><strong>{d.institution}</strong><span><MapPin size={14}/>{d.district||"لم تحدد المنطقة"}</span></div>
 <div className="referral-steps"><div><CalendarDays size={16}/><span>آخر زيارة<strong>{displayDate(d.last_visit_at||undefined,false)}</strong></span></div><div className={d.next_followup_at&&Date.parse(d.next_followup_at)<now?"referral-overdue":""}><Clock3 size={16}/><span>المتابعة القادمة<strong>{displayDate(d.next_followup_at||undefined)}</strong></span></div></div>
 <div className="referral-doctor-owner"><UserRound size={14}/>{owner(d.owner)}{Number(d.open_followups)>0&&<span>{d.open_followups} متابعة مفتوحة</span>}</div>
 <div className="referral-card-actions"><button className="crm-edit" onClick={()=>setProfileId(d.id)}>ملف الطبيب <ChevronLeft size={15}/></button>{d.active&&<button className="crm-edit" onClick={()=>addVisit(d)}><Plus size={15}/> زيارة</button>}{canEditPhysician(user,d)&&<button className="crm-edit" onClick={()=>setDoctorEditor(d)} aria-label={"تعديل ملف "+d.name}><Pencil size={16}/></button>}</div>
 </article>)}</div>:<div className="referral-visits">{visits.map(v=><article className="panel referral-visit" key={v.id}><div className="referral-visit-head"><span className="referral-doctor-icon"><CalendarDays size={21}/></span><div><button className="crm-person" onClick={()=>setProfileId(v.physician_id)}>{v.physician_name}</button><p>{v.institution}</p></div><span className="crm-badge">{visitOutcomes[v.outcome]}</span></div>
 <div className="referral-visit-meta"><span><CalendarDays size={14}/>{displayDate(v.visited_at)}</span><span><UserRound size={14}/>{owner(v.owner)}</span></div>
 {v.note&&<details className="referral-visit-notes"><summary>تفاصيل الزيارة والنتيجة</summary><p className="referral-note">{v.note}</p></details>}
 {v.next_followup_at&&<div className={"referral-followup "+(v.followup_status==="open"&&Date.parse(v.next_followup_at)<now?"is-overdue":"")}><Clock3 size={17}/><div><strong>{v.followup_status==="done"?"تمت المتابعة":"المتابعة القادمة"}</strong><span>{displayDate(v.next_followup_at)}</span>{v.completed_at&&<small>أُنجزت {displayDate(v.completed_at)}</small>}</div></div>}
 {canEditVisit(user,v)&&<div className="referral-card-actions">{v.followup_status==="open"&&<button className="crm-edit" disabled={saving===v.id} onClick={()=>completeVisit(v)}><Check size={15}/>{saving===v.id?"جارٍ الحفظ…":"تمت المتابعة"}</button>}<button className="crm-edit" onClick={()=>setVisitEditor(v)}><Pencil size={15}/> تعديل الزيارة</button></div>}
 </article>)}</div>}
 {!loading&&!error&&<ReferralPagination page={page} total={total} onChange={setPage}/>}
 </>}
 <p className="crm-report-note">مساحة الأطباء تعرض بيانات التواصل المهنية والزيارات ونتائج إجمالية. ربط الإحالة بالطلب يتم من حساب الاستقبال أو الإدارة.</p>
 {profileId&&<PhysicianProfile key={profileId} id={profileId} user={user} onClose={()=>setProfileId(null)} onEdit={(d,s)=>{setStaff(s);setProfileId(null);setDoctorEditor(d);}} onVisit={(d,s)=>{setStaff(s);setProfileId(null);addVisit(d);}} onEditVisit={(v,s)=>{setStaff(s);setProfileId(null);setVisitEditor(v);}}/>}
 {doctorEditor&&<PhysicianEditor record={doctorEditor} user={user} staff={staff} onClose={()=>setDoctorEditor(null)} onSaved={saved}/>}
 {visitEditor&&<VisitEditor record={visitEditor} user={user} staff={staff} onClose={()=>setVisitEditor(null)} onSaved={saved}/>}
 {toast&&<div className="crm-toast" role="status"><Check size={18}/>{toast}</div>}
 </div>;
}
