"use client";
import {useEffect,useState} from "react";
import {CalendarCheck2,CircleCheck,ClipboardList,Download,Search,Stethoscope,Target} from "lucide-react";
import {crmRequest} from "@/lib/crm/client";
import {displayDate,riyadhDay} from "@/lib/crm/types";
import {relationshipStatuses,type PhysicianReport} from "@/lib/crm/referrals";
import {ReferralEmpty,ReferralLoading,ReferralPagination,referralPercent} from "./ui";

function defaultStart(){const d=new Date();d.setUTCDate(d.getUTCDate()-29);return riyadhDay(d);}
function csvCell(value:string|number){
 const raw=String(value);
 const safe=typeof value==="string"&&(/^[\s]*[=+@-]/.test(raw)||/^[\t\r]/.test(raw))?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
}
function downloadReport(report:PhysicianReport){
 const header=["اسم الطبيب","التخصص","الجهة","المنطقة","إحالات","لها حجز","انتهت بحضور","أُجري الفحص","زيارات","آخر إحالة","حالة العلاقة","الفترة من","الفترة إلى"];
 const rows=report.rows.map(r=>[r.name,r.specialty,r.institution,r.district,r.referrals,r.booked,r.attended,r.completed,r.visits,r.last_referral_at?riyadhDay(new Date(r.last_referral_at)):"",relationshipStatuses[r.relationship_status],report.from,report.to]);
 const blob=new Blob(["\uFEFF"+[header,...rows].map(row=>row.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="physician-report-"+report.from+"-"+report.to+"-page-"+report.page+".csv";
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function PhysicianOutcomeReport({revision,onOpen}:{revision:number;onOpen:(id:string)=>void}){
 const [from,setFrom]=useState(defaultStart);const [to,setTo]=useState(()=>riyadhDay());const [dormant,setDormant]=useState(60);
 const [filter,setFilter]=useState("");const [search,setSearch]=useState("");const [query,setQuery]=useState("");const [page,setPage]=useState(1);
 const [report,setReport]=useState<PhysicianReport|null>(null);const [loadedKey,setLoadedKey]=useState("");const [fetchError,setError]=useState("");
 const requestKey=JSON.stringify([from,to,dormant,filter,query,page,revision]);const loading=loadedKey!==requestKey;
 const rangeError=!from||!to||from>to||to>riyadhDay()?"اختر فترة صحيحة حتى تاريخ اليوم.":"";
 const error=rangeError||(loading?"":fetchError);
 useEffect(()=>{const timer=setTimeout(()=>{setQuery(search);setPage(1);},250);return()=>clearTimeout(timer);},[search]);
 useEffect(()=>{
  const c=new AbortController();
  if(rangeError)return;
  crmRequest<{data:PhysicianReport}>("physician_report",{from,to,dormant_days:dormant,status:filter,search:query,page},c.signal).then(r=>{if(c.signal.aborted)return;setReport(r.data);setError("");setLoadedKey(requestKey);}).catch(e=>{if(!c.signal.aborted){setError(e.message);setLoadedKey(requestKey);}});
  return()=>c.abort();
 },[from,to,dormant,filter,query,page,requestKey,rangeError]);
 return <section className="panel referral-report"><div className="crm-panel-head"><div><span className="crm-section-kicker">من الإحالة إلى إتمام الفحص</span><h2>نتائج العلاقات مع الأطباء</h2><p>طلبات إحالة بدأت خلال الفترة، ونتيجتها الحالية حتى الآن.</p></div><button className="button outline" disabled={loading||Boolean(error)||!report?.rows.length} onClick={()=>report&&downloadReport(report)}><Download size={16}/> تصدير الصفحة CSV</button></div>
 <div className="referral-report-controls"><label><span>من</span><input type="date" value={from} max={to||riyadhDay()} onChange={e=>{setFrom(e.target.value);setPage(1);}}/></label><label><span>إلى</span><input type="date" value={to} min={from} max={riyadhDay()} onChange={e=>{setTo(e.target.value);setPage(1);}}/></label><label><span>توقفت الإحالات منذ</span><select value={dormant} onChange={e=>{setDormant(Number(e.target.value));setPage(1);}}><option value={30}>30 يومًا</option><option value={60}>60 يومًا</option><option value={90}>90 يومًا</option></select></label><label><span>حالة العلاقة</span><select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}><option value="">كل الأطباء</option>{Object.entries(relationshipStatuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
 <div className="crm-toolbar"><div className="crm-search"><Search size={17}/><input aria-label="بحث في تقرير الأطباء" placeholder="ابحث باسم الطبيب أو الجهة…" value={search} onChange={e=>setSearch(e.target.value)} maxLength={100}/></div></div>
 {error?<p className="crm-error" role="alert">{error}</p>:loading?<ReferralLoading/>:report&&<>
 <div className="referral-report-metrics">{[{label:"إحالات الفترة",value:report.totals.referrals,icon:ClipboardList,detail:report.totals.physicians+" طبيبًا في النتائج"},{label:"لها حجز",value:report.totals.booked,icon:Target,detail:referralPercent(report.totals.booked,report.totals.referrals)+" من الإحالات"},{label:"انتهت بحضور",value:report.totals.attended,icon:CalendarCheck2,detail:referralPercent(report.totals.attended,report.totals.referrals)+" من الإحالات"},{label:"أُجري الفحص",value:report.totals.completed,icon:CircleCheck,detail:referralPercent(report.totals.completed,report.totals.referrals)+" من الإحالات"},{label:"زيارات التسويق",value:report.totals.visits,icon:Stethoscope,detail:"زيارات فعلية خلال الفترة"}].map(m=><article key={m.label}><m.icon size={21}/><span>{m.label}</span><strong>{m.value}</strong><small>{m.detail}</small></article>)}</div>
 <div className="referral-report-status"><span><i/>{report.totals.dormant} طبيبًا توقفت إحالاته المسجلة</span><span>{report.totals.never} طبيبًا بلا إحالات مسجلة</span></div>
 {report.rows.length?<div className="crm-table-wrap"><table className="crm-table referral-report-table"><thead><tr><th>الطبيب والجهة</th><th>إحالات</th><th>لها حجز</th><th>انتهت بحضور</th><th>أُجري الفحص</th><th>إحالة ← فحص</th><th>زيارات</th><th>آخر إحالة</th><th>حالة العلاقة</th></tr></thead><tbody>{report.rows.map(r=><tr key={r.id}><td><button className="crm-person" onClick={()=>onOpen(r.id)}>{r.name}</button><small className="crm-cell-sub">{r.specialty} · {r.institution}</small></td><td>{r.referrals}</td><td>{r.booked}</td><td>{r.attended}</td><td><strong>{r.completed}</strong></td><td>{referralPercent(r.completed,r.referrals)}</td><td>{r.visits}</td><td>{displayDate(r.last_referral_at||undefined,false)}</td><td><span className={"crm-badge referral-"+r.relationship_status}>{relationshipStatuses[r.relationship_status]}</span></td></tr>)}</tbody></table></div>:<ReferralEmpty filtered/>}
 <ReferralPagination page={page} total={report.total} onChange={setPage}/>
 <p className="crm-report-note">كل طلب يُحسب مرة واحدة في الحجز والحضور وإتمام الفحص، حتى بعد إعادة الحجز. الحجز يشمل المواعيد غير الملغاة والتي لم تُسجّل كعدم حضور؛ والحضور يشمل الموعد المكتمل الذي حل توقيته. إتمام الفحص يتطلب تسجيل الموعد كمكتمل. الزيارات تُحسب بتاريخ الزيارة، ولا تعني أن الزيارة سببت الإحالة.</p>
 <p className="crm-report-note">حالة العلاقة تعتمد على آخر إحالة مسجلة حتى الآن، بصرف النظر عن الفترة المختارة. الطبيب الذي لم تُسجل له إحالات يظهر منفصلًا عن الطبيب الذي توقفت إحالاته. الإجماليات تتبع البحث والفلتر؛ ملف CSV يضم الصفحة المعروضة فقط ويمكن فتحه في Excel.</p>
 {report.unlinkedReferrals>0&&<p className="crm-attribution-gap"><strong>{report.unlinkedReferrals} طلب إحالة في الفترة من غير طبيب محدد.</strong> تظهر هنا منفصلة عن نتائج الأطباء. يحدد الاستقبال الطبيب من سجل طلب الحجز.</p>}
 <p className="crm-muted">آخر تحديث: {displayDate(report.updatedAt)} · توقيت الرياض</p>
 </>}
 </section>;
}
