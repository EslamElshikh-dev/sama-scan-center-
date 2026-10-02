import {ChevronLeft,ChevronRight,LoaderCircle,Stethoscope} from "lucide-react";
export function ReferralLoading(){return <div className="crm-loading" role="status"><LoaderCircle className="crm-spin"/> جارٍ تحميل بيانات الأطباء…</div>;}
export function ReferralEmpty({filtered=false}:{filtered?:boolean}){return <div className="crm-empty"><span><Stethoscope size={29}/></span><h3>{filtered?"لا توجد نتائج بهذه الاختيارات":"ابدأ أول علاقة مهنية"}</h3><p>{filtered?"جرّب اسمًا أو فترة أخرى، أو امسح الفلتر.":"أضف طبيبًا ثم سجّل زيارتك وموعد المتابعة القادم."}</p></div>;}
export function ReferralPagination({page,total,onChange}:{page:number;total:number;onChange:(page:number)=>void}){
 const max=Math.max(1,Math.ceil(total/50));
 return <div className="crm-pagination"><span>{total?((page-1)*50+1)+"–"+Math.min(page*50,total)+" من "+total:"0 سجل"}</span><div><button type="button" aria-label="الصفحة السابقة" disabled={page<=1} onClick={()=>onChange(page-1)}><ChevronRight size={18}/></button><span>{page} / {max}</span><button type="button" aria-label="الصفحة التالية" disabled={page>=max} onClick={()=>onChange(page+1)}><ChevronLeft size={18}/></button></div></div>;
}
export const referralPercent=(value:number,total:number)=>total?(value/total*100).toFixed(1)+"%":"—";
