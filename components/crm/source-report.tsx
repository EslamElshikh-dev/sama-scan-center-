"use client";
import { useEffect, useState } from "react";
import { CalendarCheck2, CircleCheck, Download, LoaderCircle, Target, UsersRound } from "lucide-react";
import { crmRequest } from "@/lib/crm/client";
import { outcomeCSV } from "@/lib/crm/outcome-export";
import { displayDate, riyadhDay, sources, trafficLabels, type SourceReport } from "@/lib/crm/types";

export function OutcomeReport({ revision }: { revision: number }) {
  const [days, setDays] = useState(30);
  const [dimension, setDimension] = useState<"sources" | "services" | "channelServices">("services");
  const [report, setReport] = useState<SourceReport | null>(null);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([days, revision, retry]);
  const loading = loadedKey !== requestKey;
  useEffect(() => {
    const controller = new AbortController();
    const end = new Date(); const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
    crmRequest<{ data: SourceReport }>("source_report", { from: riyadhDay(start), to: riyadhDay(end) }, controller.signal)
      .then(r => { if (!controller.signal.aborted) { setReport(r.data); setError(""); setLoadedKey(requestKey); } })
      .catch(e => { if (!controller.signal.aborted) { setError(e.message); setLoadedKey(requestKey); } });
    return () => controller.abort();
  }, [days, requestKey]);
  const totals = report?.sources.reduce((a, s) => ({ inquiries: a.inquiries + s.inquiries, booked: a.booked + s.booked, attended: a.attended + s.attended, completed: a.completed + s.completed, older: a.older + s.older, olderCompleted: a.olderCompleted + s.olderCompleted }), { inquiries: 0, booked: 0, attended: 0, completed: 0, older: 0, olderCompleted: 0 });
  const percent = (part: number, total: number) => total ? `${(part / total * 100).toFixed(1)}%` : "—";
  const rows = report?.[dimension] || [];
  function exportResults() {
    if (!report) return;
    const blob = new Blob([outcomeCSV(report, rows, row => dimension === "sources" ? sources[row.source] || row.source : row.exam + (dimension === "channelServices" ? " · " + (row.channel === "recorded" ? sources[row.source] || row.source : trafficLabels[row.channel] || row.channel) : ""))], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `samascan-outcomes-${dimension}-${report.from}-${report.to}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="panel crm-outcomes">
    <div className="crm-panel-head"><div><span className="crm-section-kicker">من طلب الحجز إلى إتمام الفحص</span><h2>أي خدمة ومصدر يحققان نتيجة؟</h2><p>طلبات بدأت خلال الفترة، ونتيجتها المسجلة حتى الآن.</p></div>
      <select aria-label="فترة قياس نتائج المصادر" value={days} onChange={e => setDays(Number(e.target.value))}><option value={7}>آخر 7 أيام</option><option value={30}>آخر 30 يومًا</option><option value={90}>آخر 90 يومًا</option></select>
    </div>
    {loading ? <div className="crm-loading"><LoaderCircle className="crm-spin" /> جارٍ قياس النتائج…</div> : error ? <p className="crm-error" role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>إعادة المحاولة</button></p> : report && totals && <>
      <div className="crm-outcome-metrics">{[
        { icon: UsersRound, label: "طلبات الفترة", value: totals.inquiries, detail: `${displayDate(report.from + "T12:00:00+03:00", false)} – ${displayDate(report.to + "T12:00:00+03:00", false)}` },
        { icon: Target, label: "طلبات لها حجز", value: totals.booked, detail: `${percent(totals.booked, totals.inquiries)} من الطلبات` },
        { icon: CalendarCheck2, label: "طلبات انتهت بحضور", value: totals.attended, detail: `${percent(totals.attended, totals.inquiries)} من الطلبات` },
        { icon: CircleCheck, label: "طلبات أُجري فحصها", value: totals.completed, detail: `${percent(totals.completed, totals.inquiries)} من الطلبات` },
      ].map(x => <article key={x.label}><x.icon size={20} /><span>{x.label}</span><strong>{x.value}</strong><small>{x.detail}</small></article>)}</div>
      <div className="crm-outcome-pipeline" aria-label="الحالة الحالية لطلبات الفترة">{([
        ["needs_booking", "طلب بلا موعد", "متابعة التواصل للوصول إلى حجز"],
        ["future_booking", "موعده لم يأتِ بعد", "الحضور ينتظر موعد الفحص"],
        ["needs_outcome", "نتيجة الموعد معلّقة", "مراجعة الحالة مع الاستقبال"],
        ["awaiting_exam", "حضر والفحص غير مسجّل", "مراجعة نتيجة الزيارة"],
        ["completed", "أجرى الفحص", "نتيجة فعلية مسجّلة"],
        ["no_show", "آخر موعد: لم يحضر", "مراجعة إمكانية إعادة الحجز"],
        ["cancelled", "طلب أو موعد ملغي", "مراجعة سبب الإلغاء"],
      ] as const).map(([key, label, hint]) => <article key={key} data-state={key}><span>{label}</span><strong>{report.pipeline[key]}</strong><small>{hint}</small></article>)}</div>
      <div className="crm-cohort-note"><div><strong>تحويل الطلبات التي مرّ على تسجيلها {report.olderDays} أيام أو أكثر</strong><span>{totals.older ? `${totals.olderCompleted} فحصًا من ${totals.older} طلبًا · ${percent(totals.olderCompleted, totals.older)}` : "لا توجد طلبات بهذا العمر في الفترة المختارة."}</span></div><p>تساعد على قراءة النتيجة مع استبعاد الطلبات الأحدث من النسبة. بعض الطلبات الأقدم قد يكون موعدها مستقبليًا.</p></div>
      <p className="crm-report-note">كل طلب يظهر في حالة واحدة أعلاه. تكرار الحجز لا يكرر الطلب، والحالة الحالية قد تتغير عند تسجيل نتيجة الموعد.</p>
      <div className="crm-outcome-controls"><div className="crm-tabs" role="group" aria-label="طريقة مقارنة النتائج">{([
        ["services", "حسب الفحص"], ["sources", "حسب المصدر"], ["channelServices", "مصدر الوصول × الفحص"],
      ] as const).map(([key, label]) => <button key={key} className={dimension === key ? "active" : ""} aria-pressed={dimension === key} onClick={() => setDimension(key)}>{label}</button>)}</div><button className="crm-edit" disabled={!rows.length} onClick={exportResults}><Download size={16} />تصدير المقارنة</button></div>
      {rows.length ? <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>{dimension === "sources" ? "المصدر" : "الفحص"}</th><th>طلبات</th><th>لها حجز</th><th>حضر</th><th>أجرى الفحص</th><th>طلب ← فحص</th><th>تحويل طلبات 7+ أيام</th><th>حل موعدها</th><th>حضور / حل موعدها</th><th>لم يحضر · مواعيد</th><th>ملغاة · مواعيد</th></tr></thead><tbody>{rows.map(s => <tr key={s.label}>
        <td><strong>{dimension === "sources" ? sources[s.source] || s.source : s.exam}</strong>{dimension === "channelServices" && <small className="crm-cell-sub">{s.channel === "recorded" ? sources[s.source] || s.source : trafficLabels[s.channel] || s.channel}</small>}</td>
        <td>{s.inquiries}</td><td>{s.booked}{s.future > 0 && <small className="crm-cell-sub">{s.future} مستقبلية</small>}</td><td>{s.attended}</td><td><strong>{s.completed}</strong></td><td>{percent(s.completed, s.inquiries)}</td><td>{percent(s.olderCompleted, s.older)}<small className="crm-cell-sub">{s.olderCompleted} / {s.older} طلبًا</small></td><td>{s.due}</td><td>{percent(s.attended, s.due)}</td><td>{s.no_show}</td><td>{s.cancelled}</td>
      </tr>)}</tbody></table></div> : <p className="crm-muted">لا توجد طلبات بدأت في الفترة المختارة.</p>}
      <p className="crm-report-note">الحجز والحضور وإجراء الفحص يُحسب كل منها مرة لكل طلب، حتى عند إعادة الحجز. الحضور يشمل من أجرى الفحص. «حل موعدها» تحسب الطلبات ذات الموعد الذي حل توقيته، وتستبعد الملغاة؛ أما عدم الحضور والإلغاء فيُحسبان كمواعيد. الطلبات الحديثة والمواعيد المستقبلية قد تخفض نسبة طلب ← فحص مؤقتًا.</p>
      <p className="crm-report-note">الصفوف مرتبة بعدد الفحوص المنجزة. قبل توسيع جذب الطلبات: استكمل النتائج المعلّقة، ثم قارن عدد الطلبات والفحوصات ونسبة تحويل الطلبات الأقدم. مصدر وصول الموقع يعتمد على رابط الحملة والجلسة، وطلبات الاتصال وواتساب تعتمد على تسجيل الاستقبال.</p>
      {report.unresolvedDue > 0 && <p className="crm-attribution-gap"><strong>{report.unresolvedDue} موعدًا حل توقيته وبقي مجدولًا أو مؤكدًا.</strong> حدّثه إلى حضر / أجرى الفحص / لم يحضر لاستكمال القياس.</p>}
      {report.unlinkedAppointments > 0 && <p className="crm-attribution-gap"><strong>{report.unlinkedAppointments} موعدًا بلا طلب مرتبط.</strong> أنشئ الموعد من طلبه حتى يدخل في مقارنة المصادر والخدمات.</p>}
    </>}
  </section>;
}
