"use client";
import { useEffect, useState } from "react";
import { CalendarCheck2, LoaderCircle, Target, UsersRound } from "lucide-react";
import { crmRequest } from "@/lib/crm/client";
import { displayDate, riyadhDay, sources, type SourceReport } from "@/lib/crm/types";

export function OutcomeReport({revision}:{revision:number}) {
 const [days,setDays]=useState(30);
 const [report,setReport]=useState<SourceReport|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError("");
  const end=new Date();const start=new Date(end);start.setUTCDate(start.getUTCDate()-days+1);
  crmRequest<{data:SourceReport}>("source_report",{from:riyadhDay(start),to:riyadhDay(end)},controller.signal).then(r=>setReport(r.data)).catch(e=>{if(e.name!=="AbortError")setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[days,revision]);
 const totals=report?.sources.reduce((a,s)=>({inquiries:a.inquiries+s.inquiries,booked:a.booked+s.booked,attended:a.attended+s.attended}),{inquiries:0,booked:0,attended:0});
 const percent=(part:number,total:number)=>total?`${(part/total*100).toFixed(1)}%`:"—";
 return <section className="panel crm-outcomes"><div className="crm-panel-head"><div><span className="crm-section-kicker">من أول طلب إلى الحضور</span><h2>أي مصدر يحقق نتيجة؟</h2><p>طلبات بدأت خلال الفترة، ونتيجتها الحالية حتى الآن.</p></div><select aria-label="فترة قياس نتائج المصادر" value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>آخر 7 أيام</option><option value={30}>آخر 30 يومًا</option><option value={90}>آخر 90 يومًا</option></select></div>
 {loading?<div className="crm-loading"><LoaderCircle className="crm-spin"/> جارٍ قياس النتائج…</div>:error?<p className="crm-error" role="alert">{error}</p>:report&&totals&&<>
 <div className="crm-outcome-metrics">{[{icon:UsersRound,label:"طلبات الفترة",value:totals.inquiries,detail:`${displayDate(report.from+"T12:00:00+03:00",false)} – ${displayDate(report.to+"T12:00:00+03:00",false)}`},{icon:Target,label:"طلبات لها حجز",value:totals.booked,detail:`${percent(totals.booked,totals.inquiries)} من الطلبات`},{icon:CalendarCheck2,label:"طلبات انتهت بحضور",value:totals.attended,detail:`${percent(totals.attended,totals.inquiries)} من الطلبات`}].map(x=><article key={x.label}><x.icon size={20}/><span>{x.label}</span><strong>{x.value}</strong><small>{x.detail}</small></article>)}</div>
 {report.sources.length?<div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>المصدر</th><th>طلبات</th><th>لها حجز</th><th>حضر أصحابها</th><th>طلب ← حضور</th><th>مواعيد لم تُحضر</th><th>مواعيد ملغاة</th></tr></thead><tbody>{report.sources.map(s=><tr key={s.source}><td><strong>{sources[s.source]||s.source}</strong></td><td>{s.inquiries}</td><td>{s.booked}</td><td>{s.attended}</td><td><span className="crm-badge crm-attended">{percent(s.attended,s.inquiries)}</span></td><td>{s.no_show}</td><td>{s.cancelled}</td></tr>)}</tbody></table></div>:<p className="crm-muted">لا توجد طلبات بدأت في الفترة المختارة.</p>}
 <p className="crm-report-note">كل طلب يُحسب مرة واحدة في الحجز والحضور، حتى مع إعادة الحجز. الحضور يشمل الموعد المكتمل الذي حل توقيته. الإلغاء وعدم الحضور يُحسبان كمواعيد، وقد يخصان طلبًا أُعيد حجزه.</p>
 {report.unlinkedAppointments>0&&<p className="crm-attribution-gap"><strong>{report.unlinkedAppointments} موعدًا خلال الفترة بلا طلب مرتبط.</strong> لا يُنسب مصدر لها تلقائيًا. أنشئ الحجز من طلبه لقياس نتيجته.</p>}
 </>}
 </section>;
}
