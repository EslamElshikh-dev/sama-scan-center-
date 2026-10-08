"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, MessageCircle, Phone, RefreshCw, Plus, LoaderCircle, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crmRequest } from "@/lib/crm/client";
import { displayDate, riyadhDay, trafficLabels, type User } from "@/lib/crm/types";

type Counts = { phone_clicks: number; whatsapp_clicks: number; phone_sessions: number; whatsapp_sessions: number;
  confirmed_calls: number; confirmed_whatsapp: number; booking_requests: number; booked: number; attended: number };
type ContactData = { from: string; to: string; updatedAt: string; metrics: Counts;
  sources: (Counts & { channel: string })[];
  recent: { created_at: string; kind: "phone" | "whatsapp"; reference: string; page_path: string; channel: string; campaign: string; confirmed: boolean }[] };
const labels: Record<string, string> = { ...trafficLabels, unknown: "غير معروف" };
const cards = [
  { key: "phone_clicks", label: "ضغطات الاتصال بالموقع", icon: Phone, note: "فتح الاتصال؛ وصول المكالمة ينتظر تأكيد الاستقبال" },
  { key: "whatsapp_clicks", label: "فتح واتساب من الموقع", icon: MessageCircle, note: "فتح المحادثة؛ إرسال الرسالة ينتظر تأكيد الاستقبال" },
  { key: "confirmed_calls", label: "اتصالات واردة مسجلة", icon: Phone, note: "تواصل فعلي أكدّه الاستقبال في CRM" },
  { key: "confirmed_whatsapp", label: "تواصل واتساب مسجل", icon: MessageCircle, note: "تواصل فعلي أكدّه الاستقبال في CRM" },
  { key: "booking_requests", label: "طلبات حجز من النموذج", icon: CalendarCheck, note: "طلبات وصلت إلى الاستقبال وتنتظر تأكيد الموعد" },
  { key: "booked", label: "مواعيد مؤكدة", icon: CalendarCheck, note: "من طلبات الفترة المختارة، ويشمل من حضر أو أكمل الفحص" },
] as const;

function ReceivedContactForm({ reference, kind, onClose, onSaved }: {
  reference: string; kind: "phone" | "whatsapp"; onClose: () => void; onSaved: () => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({ name: "", phone: "", exam: "", kind, channel: "unknown", reference });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await crmRequest("contact_record", { request_id: requestId, ...form }); onSaved(); }
    catch (error) { setError(error instanceof Error ? error.message : "تعذّر الحفظ"); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent dir="rtl" className="crm-dialog"><DialogHeader>
      <DialogTitle>سجّل تواصلًا وصل فعلًا</DialogTitle>
      <DialogDescription>بعد استلام المكالمة أو الرسالة: يُنشأ طلب في CRM ومهمة متابعة لتأكيد الموعد. استخدم النموذج مرة واحدة لكل طلب جديد.</DialogDescription>
    </DialogHeader><form className="crm-form" onSubmit={submit}>
      <label className="crm-field"><span>اسم العميل *</span><input required minLength={2} maxLength={100} autoComplete="off" value={form.name} onChange={event => update("name", event.target.value)}/></label>
      <label className="crm-field"><span>رقم الجوال *</span><input required type="tel" inputMode="tel" dir="ltr" placeholder="05xxxxxxxx" maxLength={25} autoComplete="off" value={form.phone} onChange={event => update("phone", event.target.value)}/></label>
      <label className="crm-field"><span>وسيلة التواصل الفعلية *</span><select value={form.kind} onChange={event => update("kind", event.target.value)}><option value="phone">اتصال وارد</option><option value="whatsapp">رسالة واتساب واردة</option></select></label>
      <label className="crm-field"><span>الفحص المطلوب *</span><select required value={form.exam} onChange={event => update("exam", event.target.value)}><option value="">اختر الفحص</option>{["رنين مغناطيسي", "سونار", "دوبلر", "سونار 3D / 4D"].map(exam => <option key={exam}>{exam}</option>)}</select></label>
      <label className="crm-field"><span>مرجع التواصل · اختياري</span><input dir="ltr" maxLength={15} pattern="SC-[a-fA-F0-9]{12}" placeholder="SC-XXXXXXXXXXXX" value={form.reference} onChange={event => update("reference", event.target.value.toUpperCase())}/></label>
      <label className="crm-field"><span>كيف عرف المركز؟</span><select disabled={Boolean(form.reference)} value={form.channel} onChange={event => update("channel", event.target.value)}>{["unknown", "google_ads", "google_business_profile", "google_organic", "social", "referral", "direct"].map(channel => <option key={channel} value={channel}>{labels[channel]}</option>)}</select></label>
      <p className="crm-muted crm-full">انسخ المرجع من رسالة واتساب لربطه بالصفحة ومصدر الوصول تلقائيًا. دون مرجع، اختر المصدر حسب إفادة العميل واتركه غير معروف إن لم يؤكده.</p>
      {error && <p className="crm-error crm-full" role="alert">{error}</p>}
      <div className="crm-dialog-actions crm-full"><button className="button primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="crm-spin"/> : <Check size={17}/>} {busy ? "جارٍ الحفظ…" : "حفظ التواصل وإنشاء المتابعة"}</button><button className="button outline" type="button" disabled={busy} onClick={onClose}>إلغاء</button></div>
    </form></DialogContent>
  </Dialog>;
}

export default function ContactMonitor({ user, onNavigate }: { user: User; onNavigate: (view: "inquiries") => void }) {
  const [from, setFrom] = useState("2026-10-07");
  const [to, setTo] = useState(riyadhDay);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<ContactData | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [editor, setEditor] = useState<{ reference: string; kind: "phone" | "whatsapp" } | null>(null);
  const canRecord = user.role !== "marketing";
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>; let running = false;
    async function update() {
      if (document.hidden || running || controller.signal.aborted) return;
      running = true;
      try {
        const result = await crmRequest<{ data: ContactData }>("contact_metrics", { from, to }, controller.signal);
        if (!controller.signal.aborted) { setData(result.data); setError(""); }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "تعذّر تحديث البيانات");
      } finally {
        running = false;
        if (!controller.signal.aborted) timer = setTimeout(update, 15000);
      }
    }
    const visible = () => { clearTimeout(timer); void update(); };
    void update(); document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
  }, [from, to, refresh]);
  const current = data?.from === from && data.to === to ? data : null;
  return <div className="contact-monitor">
    <section className="panel contact-campaign">
      <div><span className="eyebrow">حملة بحث سما سكان · الرياض بالكامل</span><h2>من الضغطة إلى التواصل والحجز</h2><p>متوسط الميزانية اليومية <strong>٥٠ ريالًا</strong> · الاتصال والواتساب: <b dir="ltr">0559617558</b></p></div>
      <div className="contact-channel-status"><span>الموقع ونموذج الحجز: متصلان</span><span>المكالمات ورسائل واتساب: يؤكدها الاستقبال</span></div>
    </section>
    <div className="contact-monitor-toolbar">
      <label>من <input aria-label="بداية فترة القياس" type="date" value={from} max={to} onChange={event => setFrom(event.target.value)}/></label>
      <label>إلى <input aria-label="نهاية فترة القياس" type="date" value={to} min={from} max={riyadhDay()} onChange={event => setTo(event.target.value)}/></label>
      <button className="button outline" onClick={() => { setFrom(riyadhDay()); setTo(riyadhDay()); }}>اليوم</button>
      <button className="button outline" aria-label="تحديث القياس" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16}/> تحديث</button>
      {canRecord && <button className="button primary" onClick={() => { setSaved(false); setEditor({ reference: "", kind: "phone" }); }}><Plus size={17}/> سجّل تواصلًا واردًا</button>}
    </div>
    <p className="contact-monitor-status" role="status">{error ? `تعذّر التحديث: ${error}. الأرقام الظاهرة هي آخر بيانات محفوظة.` : current ? `آخر تحديث ${displayDate(current.updatedAt)} · تحديث تلقائي كل ١٥ ثانية أثناء فتح الصفحة` : "جارٍ تحميل القياس الفعلي…"}</p>
    {saved && <div className="contact-saved" role="status"><Check size={18}/> حُفظ التواصل وأنشئت مهمة متابعة في CRM. <button onClick={() => onNavigate("inquiries")}>افتح الطلبات لإتمام الحجز</button></div>}
    {current ? <>
      <div className="contact-metrics-grid">{cards.map(card => <article className="metric" key={card.key}><div className="metric-top"><span>{card.label}</span><card.icon size={19}/></div><strong className="metric-value" dir="ltr">{current.metrics[card.key]}</strong><p>{card.note}</p></article>)}</div>
      <section className="panel"><div className="panel-title"><div><h2>مصدر الوصول ونتيجته</h2><p>الضغطات من الموقع فقط. التواصل والحجز من السجلات الفعلية للطلبات الواردة خلال الفترة، بتوقيت الرياض.</p></div></div>
        <div className="contact-table-wrap"><table className="contact-results-table"><thead><tr><th>المصدر</th><th>ضغطات اتصال</th><th>فتح واتساب</th><th>اتصالات مسجلة</th><th>واتساب مسجل</th><th>طلبات النموذج</th><th>مواعيد مؤكدة</th><th>حضور / فحص</th></tr></thead><tbody>
          {current.sources.length ? current.sources.map(row => <tr key={row.channel}><th>{labels[row.channel] ?? "غير معروف"}</th>{[row.phone_clicks, row.whatsapp_clicks, row.confirmed_calls, row.confirmed_whatsapp, row.booking_requests, row.booked, row.attended].map((count, index) => <td key={index}>{count}</td>)}</tr>) : <tr><td colSpan={8}>لا توجد أحداث أو طلبات مسجلة في هذه الفترة.</td></tr>}
        </tbody></table></div>
      </section>
      <section className="panel"><div className="panel-title"><div><h2>آخر ضغطات التواصل</h2><p>قد يضغط نفس الزائر أكثر من مرة؛ عدد الجلسات التي ضغطت الاتصال: {current.metrics.phone_sessions}، وواتساب: {current.metrics.whatsapp_sessions}.</p></div></div>
        <div className="contact-table-wrap"><table className="contact-results-table"><thead><tr><th>وقت الضغطة</th><th>الوسيلة</th><th>المصدر والصفحة</th><th>المرجع</th><th>التواصل الفعلي</th></tr></thead><tbody>
          {current.recent.length ? current.recent.map(event => <tr key={event.reference}><td>{displayDate(event.created_at)}</td><td>{event.kind === "phone" ? "فتح اتصال" : "فتح واتساب"}</td><td>{labels[event.channel]}<small dir="ltr">{event.page_path}</small></td><td><code>{event.reference}</code></td><td>{event.confirmed ? "أكدّه الاستقبال" : canRecord ? <button className="contact-link-button" onClick={() => { setSaved(false); setEditor({ reference: event.reference, kind: event.kind }); }}>سجّل فقط إن وصل التواصل</button> : "لم يؤكَّد وصوله"}</td></tr>) : <tr><td colSpan={5}>تظهر الضغطات الجديدة هنا بعد تشغيل الربط.</td></tr>}
        </tbody></table></div>
      </section>
    </> : !error && <div className="crm-loading"><LoaderCircle className="crm-spin"/> جارٍ تحميل البيانات…</div>}
    <details className="panel contact-audit-snapshot"><summary>نتائج Google Ads الموثقة ليوم ٧ أكتوبر ٢٠٢٦</summary><p>١٢ نقرة · ١٢١ ظهورًا · صرف ٦٣٫٦٥ ريال. منها ضغطتان على زر الاتصال بالإعلان، و٣ تحويلات فتح واتساب من الموقع، وصفر تحويلات اتصال بالموقع. هذه لقطة موثقة وليست عدّادًا مباشرًا؛ لم تؤكد وصول مكالمات أو رسائل.</p></details>
    <p className="contact-monitor-footnote">الربط الجديد يسجل ضغطات الموقع من وقت تشغيله. ضغطات الاتصال داخل الإعلان تحتاج بيانات Google Ads؛ لا تُضاف تلقائيًا إلى عدّاد الموقع. تسجيل الرسائل والمكالمات الواردة تلقائيًا يتطلب WhatsApp Business Platform ونظام اتصالات يدعم الربط. إلى حين ذلك، يسجل الاستقبال التواصل الذي وصل فعلًا من الزر أعلاه.</p>
    {editor && <ReceivedContactForm key={`${editor.reference}:${editor.kind}`} {...editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setSaved(true); setRefresh(value => value + 1); }}/>} 
  </div>;
}
