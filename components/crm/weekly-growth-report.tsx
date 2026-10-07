"use client";
import { useEffect, useState } from "react";
import { crmRequest } from "@/lib/crm/client";
import { displayDate, sources } from "@/lib/crm/types";
import { acquisitionChannels, contactMethods, type WeeklyPeriod } from "@/lib/growth";

export function WeeklyGrowthReport({ revision = 0 }: { revision?: number }) {
  const [periods, setPeriods] = useState<WeeklyPeriod[]>([]);
  const [from, setFrom] = useState("");
  const [loaded, setLoaded] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([revision, from, retry]);
  useEffect(() => {
    const c = new AbortController();
    crmRequest<{ data: { periods: WeeklyPeriod[] } }>("growth_weekly", from ? { from } : {}, c.signal)
      .then(r => { if (!c.signal.aborted) { setPeriods(r.data.periods); setError(""); setLoaded(key); } })
      .catch(e => { if (!c.signal.aborted) { setError(e.message); setLoaded(key); } });
    return () => c.abort();
  }, [from, key]);
  const current = periods[0], previous = periods[1];
  const total = (period: WeeklyPeriod, field: "requests" | "reached" | "booked" | "confirmed" | "attended" | "completed") => (period.rows || []).reduce((sum, row) => sum + row[field], 0);
  return <section className="panel growth-panel"><div className="crm-panel-head"><div><span className="crm-section-kicker">المتابعة الأسبوعية</span><h2>من نقرات الاتصال إلى الحضور</h2><p>أسبوعان متساويان، ونتائج فعلية من CRM حتى وقت العرض.</p></div><label>بداية أسبوع القياس<input aria-label="بداية أسبوع القياس" type="date" value={from} onChange={e => setFrom(e.target.value)}/></label></div>
    {loaded !== key ? <p role="status">جارٍ قراءة النتائج…</p> : error ? <p className="crm-error" role="alert">{error} <button onClick={() => setRetry(n => n + 1)}>إعادة المحاولة</button></p> : current && previous ? <>
      <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>المقياس</th>{[current, previous].map(p => <th key={p.date_from}>{displayDate(p.date_from + "T12:00:00+03:00", false)} – {displayDate(p.date_to + "T12:00:00+03:00", false)}</th>)}</tr></thead><tbody>
        <tr><td>ضغطات اتصال الملف التجاري</td>{[current, previous].map(p => <td key={p.date_from}>{p.google ? p.google.calls : "غير مستوردة"}</td>)}</tr>
        {([["requests", "طلبات CRM المسجلة"], ["reached", "طلبات مسجّل لها تواصل ناجح"], ["booked", "طلبات لها موعد قائم"], ["confirmed", "طلبات تأكد موعدها"], ["attended", "طلبات انتهت بحضور"], ["completed", "طلبات أُجري فحصها"]] as const).map(([field, title]) => <tr key={field}><td>{title}</td>{[current, previous].map(p => <td key={p.date_from}>{total(p, field)}</td>)}</tr>)}
      </tbody></table></div>
      <p className="crm-report-note">تخص نتائج CRM الطلبات التي سُجلت في كل أسبوع، وتُحسب النتيجة مرة لكل طلب حتى مع إعادة الحجز. الطلبات الحديثة قد تنتظر موعدها؛ الأرقام لا تمثل كل مكالمات الهاتف أو حجوزات المركز إذا لم تُسجّل.</p>
      <h3>تفصيل طلبات الأسبوع الأحدث</h3>{current.rows?.length ? <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>مصدر الوصول</th><th>مصدر الاستقبال</th><th>وسيلة التواصل</th><th>طلبات</th><th>تواصل ناجح</th><th>موعد مؤكد</th><th>حضر</th><th>أجرى الفحص</th></tr></thead><tbody>{current.rows.map((r, i) => <tr key={i}><td>{acquisitionChannels[r.channel] || "غير معروف"}</td><td>{sources[r.source] || r.source}</td><td>{contactMethods[r.contact_method] || "غير موثّق"}</td><td>{r.requests}</td><td>{r.reached}</td><td>{r.confirmed}</td><td>{r.attended}</td><td>{r.completed}</td></tr>)}</tbody></table></div> : <p className="crm-muted">لا توجد طلبات CRM مسجلة بدأت في هذا الأسبوع.</p>}
      <p className="crm-attribution-gap">ضغطات Google إجمالية ومجهولة الهوية؛ لا نربطها بأشخاص أو نحسب منها نسبة حجز. المكالمة المجابة والفائتة تحتاجان سجل هاتف. يسأل الاستقبال عن مصدر الوصول ويسجل نتيجة التواصل والموعد والحضور.</p>
      {[current, previous].map(p => <p className="crm-report-note" key={p.date_from}>{p.date_from} – {p.date_to}: {p.google ? `${p.google.source} · آخر استيراد ${displayDate(p.google.imported_at)}` : "بيانات Google لهذه الفترة غير مستوردة."}{p.unlinked > 0 && ` · ${p.unlinked} موعدًا غير مرتبط بطلب، خارج مقارنة المصادر.`}</p>)}
      <p className="crm-report-note">مرجع سابق: 131 ضغطة اتصال من 4 سبتمبر إلى 3 أكتوبر 2026، وفق استخراج الملف التجاري بتاريخ 7 أكتوبر؛ ليست 131 مكالمة مجابة أو حجزًا.</p>
    </> : <p className="crm-muted">استورد فترة Google مكتملة لبدء المقارنة.</p>}
  </section>;
}
