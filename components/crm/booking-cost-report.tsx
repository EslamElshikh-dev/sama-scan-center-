"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2, Check, CircleDollarSign, LoaderCircle, RefreshCw, Target, UsersRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crmRequest } from "@/lib/crm/client";
import { recentClosedDays, type BookingCostReport, type SpendDay } from "@/lib/crm/booking-cost";
import { displayDate, riyadhDay, type User } from "@/lib/crm/types";

const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(value);
const dayLabel = (day: string) => displayDate(`${day}T12:00:00+03:00`, false);

function SpendForm({ row, onSaved, onClose }: { row: SpendDay; onSaved: () => void; onClose: () => void }) {
  const [amount, setAmount] = useState(row.amount === null ? "" : String(row.amount));
  const [evidence, setEvidence] = useState(row.evidence ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await crmRequest("booking_cost_save", { day: row.day, amount: Number(amount), evidence, version: row.version }); onSaved(); }
    catch (error) { setError(error instanceof Error ? error.message : "تعذّر حفظ الإنفاق"); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent dir="rtl" className="crm-dialog"><DialogHeader>
    <DialogTitle>إنفاق حملة سما سكان · {dayLabel(row.day)}</DialogTitle>
    <DialogDescription>دوّن تكلفة اليوم الفعلية من Google Ads للحملة 24332875672 فقط، بتوقيت الرياض وبالريال. الميزانية اليومية لا تُستخدم بدل الإنفاق.</DialogDescription>
  </DialogHeader><form className="crm-form" onSubmit={submit}>
    <label className="crm-field crm-full"><span>الإنفاق الفعلي بالريال *</span><input required type="number" inputMode="decimal" min={0} max={1000000} step="0.01" dir="ltr" value={amount} onChange={event => setAmount(event.target.value)} /></label>
    <label className="crm-field crm-full"><span>مرجع مراجعة الإنفاق *</span><textarea required minLength={3} maxLength={300} rows={2} value={evidence} onChange={event => setEvidence(event.target.value)} placeholder="مثال: تقرير تكلفة الحملة في Google Ads، روجع بعد إغلاق اليوم" /></label>
    <p className="crm-muted crm-full">اترك اليوم غير موثّق إذا لم تتأكد من التكلفة. أدخل صفرًا فقط إذا راجعت التقرير ولم يوجد إنفاق.</p>
    {error && <p className="crm-error crm-full" role="alert">{error}</p>}
    <div className="crm-dialog-actions crm-full"><button className="button primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="crm-spin" /> : <Check size={17} />} حفظ الإنفاق</button><button className="button outline" type="button" disabled={busy} onClick={onClose}>إلغاء</button></div>
  </form></DialogContent></Dialog>;
}

export function BookingCostReportPanel({ user, revision = 0 }: { user: User; revision?: number }) {
  const [period, setPeriod] = useState(() => recentClosedDays(7));
  const [report, setReport] = useState<BookingCostReport | null>(null);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState<SpendDay | null>(null);
  const key = JSON.stringify([period.from, period.to, revision, refresh]);
  useEffect(() => {
    const controller = new AbortController();
    crmRequest<{ data: BookingCostReport }>("booking_cost_report", period, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setReport(result.data); setError(""); setLoadedKey(key); } })
      .catch(error => { if (!controller.signal.aborted) { setError(error instanceof Error ? error.message : "تعذّر تحميل التقرير"); setLoadedKey(key); } });
    return () => controller.abort();
  }, [key, period]);
  const current = loadedKey === key ? report : null;
  const missing = current ? current.totalDays - current.coveredDays : 0;
  return <section className="panel crm-outcomes crm-booking-cost">
    <div className="crm-panel-head"><div><span className="crm-section-kicker">نتيجة حملة سما سكان</span><h2>تكلفة الحجز المؤكد من الإعلان</h2><p>إنفاق الحملة ونتائج الطلبات التي بدأت في الفترة؛ تُحدَّث نتيجة الحجز مع متابعة الاستقبال.</p></div><button className="crm-edit" onClick={() => setRefresh(value => value + 1)} aria-label="تحديث تقرير تكلفة الحجز"><RefreshCw size={16} /> تحديث</button></div>
    <div className="crm-cost-period"><label>من<input aria-label="تكلفة الحجز: من تاريخ" type="date" value={period.from} max={period.to} onChange={event => { if (event.target.value) setPeriod(value => ({ ...value, from: event.target.value })); }} /></label><label>إلى<input aria-label="تكلفة الحجز: إلى تاريخ" type="date" value={period.to} min={period.from} max={riyadhDay()} onChange={event => { if (event.target.value) setPeriod(value => ({ ...value, to: event.target.value })); }} /></label><button className="crm-edit" onClick={() => setPeriod(recentClosedDays(7))}>آخر 7 أيام مكتملة</button><button className="crm-edit" onClick={() => setPeriod(recentClosedDays(30))}>آخر 30 يومًا مكتملًا</button></div>
    {loadedKey !== key ? <div className="crm-loading"><LoaderCircle className="crm-spin" /> جارٍ قياس تكلفة الحجز…</div> : error ? <p className="crm-error" role="alert">{error}</p> : current && <>
      <div className="crm-outcome-metrics">{[
        { icon: CircleDollarSign, label: missing ? "الإنفاق الموثّق جزئيًا" : "إنفاق الفترة الموثّق", value: money(current.spend), detail: `${current.coveredDays} / ${current.totalDays} أيام موثّقة` },
        { icon: UsersRound, label: "طلبات مرتبطة بهذه الحملة", value: current.metrics.inquiries, detail: `${current.metrics.calls} اتصال · ${current.metrics.whatsapp} واتساب · ${current.metrics.forms} نموذج` },
        { icon: CalendarCheck2, label: "حجوزات مؤكدة مرتبطة", value: current.metrics.confirmed, detail: "مرة لكل طلب؛ يشمل الحضور والفحص" },
        { icon: Target, label: "تكلفة الحجز المرتبط بالحملة", value: money(current.costPerConfirmed), detail: missing ? "تنتظر استكمال إنفاق أيام الفترة" : current.metrics.confirmed ? "إنفاق الفترة ÷ الحجوزات المؤكدة" : "لم يُسجل حجز مؤكد مرتبط في الفترة" },
      ].map(item => <article key={item.label}><item.icon size={20} /><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></article>)}</div>
      <p className="crm-report-note">الحملة: <b dir="ltr">{current.campaignId}</b>. يدخل الطلب عند توثيق مصدره «إعلانات Google» وربطه بحملة سما سكان. الموعد المجدول وحده وفتح الاتصال أو واتساب لا يُحسبان حجزًا مؤكدًا. الملغي وعدم الحضور مستبعدان من عدد الحجوزات الحالية.</p>
      {missing > 0 && <p className="crm-attribution-gap"><strong>{missing} أيام بلا إنفاق موثّق.</strong> التكلفة مخفية حتى اكتمال الفترة؛ الأيام الناقصة لا تُحسب صفرًا.</p>}
      {(current.gaps.unassignedAds > 0 || current.gaps.unknownReceived > 0) && <p className="crm-attribution-gap"><strong>ربط المصدر يحتاج استكمالًا:</strong> {current.gaps.unassignedAds} طلبًا من إعلانات Google بلا حملة محددة، و{current.gaps.unknownReceived} تواصلًا واردًا بلا مصدر معلوم. لا تُنسب للحملة بالتخمين، وقد تكون النتيجة المسجلة أقل من الواقع.</p>}
      {current.snapshotDays > 0 && <p className="crm-report-note">{current.snapshotDays} أيام تعتمد على نسخة محفوظة من بيانات الإعلان. راجعها في Google Ads قبل اعتماد المقارنة المالية؛ تكلفة الإعلان قد تُعدّل لاحقًا.</p>}
      {current.services.length > 0 && <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>الفحص</th><th>طلبات الحملة</th><th>اتصال وارد</th><th>واتساب وارد</th><th>نماذج</th><th>حجز مؤكد</th><th>حضر</th><th>أجرى الفحص</th></tr></thead><tbody>{current.services.map(row => <tr key={row.exam}><th>{row.exam}</th><td>{row.inquiries}</td><td>{row.calls}</td><td>{row.whatsapp}</td><td>{row.forms}</td><td><strong>{row.confirmed}</strong></td><td>{row.attended}</td><td>{row.completed}</td></tr>)}</tbody></table></div>}
      <details className="crm-cost-days"><summary>الإنفاق اليومي ومصدر توثيقه</summary><div className="crm-table-wrap"><table className="crm-table"><thead><tr><th>اليوم</th><th>إنفاق الحملة</th><th>مصدر التوثيق</th>{user.role === "admin" && <th>مراجعة</th>}</tr></thead><tbody>{current.days.map(row => <tr key={row.day}><th>{dayLabel(row.day)}</th><td>{money(row.amount)}</td><td>{row.origin === "ads_snapshot" ? "نسخة محفوظة من الإعلان" : row.origin === "reviewed" ? "إنفاق راجعه المدير" : "لم يُوثّق"}<small className="crm-cell-sub">{row.evidence}</small></td>{user.role === "admin" && <td>{row.day < riyadhDay() ? <button className="crm-edit" onClick={() => setEditor(row)}>{row.amount === null ? "وثّق الإنفاق" : "راجع / حدّث"}</button> : "ينتظر إغلاق اليوم"}</td>}</tr>)}</tbody></table></div></details>
      <p className="crm-report-note">هذا قياس داخلي حسب تاريخ تسجيل الطلب بتوقيت الرياض، وحالة مواعيده حتى الآن. إعادة الحجز لا تكرر الطلب، ونتائج الطلبات الحديثة قد تتأخر. تكلفة كل خدمة لا تُوزّع تقديريًا من إجمالي الحملة. طلبات الحملات الأخرى ({current.gaps.otherCampaigns}) خارج المقارنة.</p>
    </>}
    {editor && <SpendForm row={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setRefresh(value => value + 1); }} />}
  </section>;
}
