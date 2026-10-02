"use client";
import {useEffect,useState} from "react";
import {Check,Search,Stethoscope} from "lucide-react";
import {crmRequest} from "@/lib/crm/client";
import type {PhysicianOption} from "@/lib/crm/referrals";

export function PhysicianPicker({value,label,onChange,optional=false,disabled=false}:{value?:string;label?:string;onChange:(doctor:PhysicianOption|null)=>void;optional?:boolean;disabled?:boolean}){
 const [search,setSearch]=useState("");const [open,setOpen]=useState(!value);const [rows,setRows]=useState<PhysicianOption[]>([]);
 const [loading,setLoading]=useState(false);const [error,setError]=useState("");
 useEffect(()=>{
  if(!open||disabled)return;
  const controller=new AbortController();
  const timer=setTimeout(()=>{
   setLoading(true);setError("");
   crmRequest<{rows:PhysicianOption[]}>("physician_options",{search},controller.signal).then(r=>setRows(r.rows)).catch(e=>{if(e.name!=="AbortError")setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  },250);
  return()=>{controller.abort();clearTimeout(timer);};
 },[search,open,disabled]);
 return <div className="crm-field crm-full"><span>الطبيب المحوِّل {optional?<small>· اختياري</small>:"*"}</span>
 {value&&!open?<div className="crm-selected-contact"><Stethoscope size={18}/><strong>{label||"الطبيب المحدد"}</strong>{!disabled&&<button type="button" onClick={()=>setOpen(true)}>تغيير</button>}{optional&&!disabled&&<button type="button" onClick={()=>{onChange(null);setOpen(true);}}>إزالة</button>}</div>:<>
 <div className="crm-search"><Search size={17}/><input aria-label="بحث عن طبيب" placeholder="اسم الطبيب أو تخصصه أو جهة عمله…" value={search} onChange={e=>setSearch(e.target.value)} maxLength={100}/></div>
 <div className="crm-contact-options">{loading?<p>جارٍ البحث…</p>:error?<p role="alert">{error}</p>:rows.length?rows.map(d=><button type="button" key={d.id} onClick={()=>{onChange(d);setOpen(false);}}><span><strong>{d.name}</strong><small>{d.specialty} · {d.institution}</small></span><Check size={16}/></button>):<p>لا توجد نتائج. أضف الطبيب من قسم الأطباء المحوِّلين أولًا.</p>}</div>
 <small>يعرض أول 50 طبيبًا نشطًا. استخدم البحث لتحديد الطبيب.</small>
 </>}{optional&&<small>تُسجّل الإحالات غير المحددة بشكل منفصل في التقرير.</small>}</div>;
}
