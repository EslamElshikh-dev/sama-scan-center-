"use client";

import { useState } from "react";
import { Check, ClipboardCheck, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crmRequest } from "@/lib/crm/client";
import { displayDate, type User } from "@/lib/crm/types";

export type ContactDay = {
  day: string; reported_calls: number | null; reported_whatsapp: number | null;
  recorded_calls: number; recorded_whatsapp: number; report_origin: "user_report" | "reception" | null;
  note: string | null; updated_at: string | null; version: number;
};
export type ContactDailyData = { from: string; to: string; days: ContactDay[] };

const dayLabel = (day: string) => displayDate(`${day}T12:00:00+03:00`, false);
const reportedTotal = (day: ContactDay) => day.reported_calls === null || day.reported_whatsapp === null
  ? null : day.reported_calls + day.reported_whatsapp;

function DailyTotalForm({ row, onSaved, onClose }: { row: ContactDay; onSaved: () => void; onClose: () => void }) {
  const [calls, setCalls] = useState(row.reported_calls === null ? "" : String(row.reported_calls));
  const [whatsapp, setWhatsapp] = useState(row.reported_whatsapp === null ? "" : String(row.reported_whatsapp));
  const [note, setNote] = useState(row.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await crmRequest("contact_daily_save", { day: row.day, calls: Number(calls), whatsapp: Number(whatsapp), note, version: row.version });
      onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "تعذّر حفظ الإجمالي"); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent dir="rtl" className="crm-dialog"><DialogHeader>
      <DialogTitle>إجمالي التواصل الوارد · {dayLabel(row.day)}</DialogTitle>
      <DialogDescription>سجّل إجمالي اليوم بعد مراجعة سجل الهاتف وواتساب. هذا إجمالي مستقل للمطابقة؛ لا ينشئ عملاء أو طلبات ولا يُجمع مع السجلات الفردية.</DialogDescription>
    </DialogHeader><form className="crm-form" onSubmit={submit}>
      <label className="crm-field"><span>المكالمات الواردة التي وصلت فعلًا *</span><input required type="number" inputMode="numeric" min={0} max={10000} step={1} dir="ltr" value={calls} onChange={event => setCalls(event.target.value)} /></label>
      <label className="crm-field"><span>تواصلات واتساب الواردة *</span><input required type="number" inputMode="numeric" min={0} max={10000} step={1} dir="ltr" value={whatsapp} onChange={event => setWhatsapp(event.target.value)} /></label>
      <label className="crm-field crm-full"><span>ملاحظة عن مراجعة الإجمالي · اختياري</span><textarea maxLength={300} rows={2} value={note} onChange={event => setNote(event.target.value)} placeholder="مثال: تمت مراجعة سجل الهاتف وواتساب حتى نهاية الدوام" /></label>
      <p className="crm-muted crm-full">احسب المحادثة الواحدة مرة واحدة خلال اليوم، وليس كل رسالة. إذا لم تُراجع العدد بعد، اترك الإجمالي غير موثّق بدل إدخال صفر.</p>
      {error && <p className="crm-error crm-full" role="alert">{error}</p>}
      <div className="crm-dialog-actions crm-full"><button className="button primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="crm-spin" /> : <Check size={17} />} {busy ? "جارٍ الحفظ…" : "حفظ إجمالي اليوم"}</button><button className="button outline" type="button" disabled={busy} onClick={onClose}>إلغاء</button></div>
    </form></DialogContent>
  </Dialog>;
}

export default function ContactDailyReport({ data, error, user, onSaved }: {
  data: ContactDailyData | null; error: string; user: User; onSaved: () => void;
}) {
  const [editor, setEditor] = useState<ContactDay | null>(null);
  const canRecord = user.role === "admin" || user.role === "reception";
  const days = data?.days ?? [];
  const last = days[0], previous = days[1];
  const lastTotal = last ? reportedTotal(last) : null;
  const previousTotal = previous ? reportedTotal(previous) : null;
  const change = lastTotal !== null && previousTotal !== null && previousTotal > 0
    ? Math.round((lastTotal / previousTotal - 1) * 100) : null;
  return <section className="panel contact-daily-report">
    <div className="panel-title"><div><span className="eyebrow">التواصل الذي وصل فعلًا</span><h2>الوارد اليومي ومطابقته مع CRM</h2><p>إجمالي الاستقبال يشمل كل المصادر. السجلات الفردية توضح المصدر والحجز بعد توثيق كل طلب.</p></div><ClipboardCheck size={25} /></div>
    {last && previous && change !== null && <p className="contact-daily-comparison"><strong>{dayLabel(last.day)}: {lastTotal}</strong><span>مقابل {previousTotal} يوم {dayLabel(previous.day)}</span><b className={change < 0 ? "is-decrease" : "is-increase"}>{change > 0 ? "+" : ""}{change}٪</b></p>}
    {error && <p className="crm-error" role="alert">تعذّر تحديث المطابقة: {error}</p>}
    {data ? <div className="contact-table-wrap"><table className="contact-results-table contact-daily-table"><thead><tr><th>اليوم</th><th>اتصال وارد</th><th>واتساب وارد</th><th>الإجمالي الوارد</th><th>تواصل مسجل في CRM</th><th>فرق العدد</th>{canRecord && <th>مراجعة الإجمالي</th>}</tr></thead><tbody>
      {days.map(row => {
        const total = reportedTotal(row), recorded = row.recorded_calls + row.recorded_whatsapp;
        const gap = total === null ? null : total - recorded;
        return <tr key={row.day}><th>{dayLabel(row.day)}<small>{row.report_origin === "user_report" ? "إفادة إسلام" : row.report_origin === "reception" ? "موثّق من الاستقبال" : "الإجمالي لم يُوثّق"}</small></th><td>{row.reported_calls ?? "—"}</td><td>{row.reported_whatsapp ?? "—"}</td><td><strong>{total ?? "—"}</strong></td><td>{recorded}<small>{row.recorded_calls} اتصال · {row.recorded_whatsapp} واتساب</small></td><td>{gap === null ? "—" : gap === 0 ? <span className="contact-reconciled">متطابق</span> : <span className="contact-unreconciled">{Math.abs(gap)}<small>{gap > 0 ? "تواصلات تحتاج مراجعة التسجيل" : "راجع الإجمالي والسجلات"}</small></span>}</td>{canRecord && <td><button className="contact-link-button" onClick={() => setEditor(row)}>{total === null ? "وثّق الإجمالي" : "راجع / حدّث"}</button></td>}</tr>;
      })}
    </tbody></table></div> : !error && <p className="crm-muted" role="status">جارٍ تحميل المقارنة اليومية…</p>}
    <p className="contact-daily-note">«—» تعني أن الإجمالي لم يُوثّق، والصفر يعني أن العدد روجع ولم يصل تواصل. الوارد والسجلات الفردية يُعرضان للمطابقة ولا يُجمعان معًا. العدد غير المربوط بطلب يبقى بلا مصدر إعلاني مؤكد.</p>
    {editor && <DailyTotalForm row={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); onSaved(); }} />}
  </section>;
}
