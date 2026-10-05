"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Link2, ListChecks, LoaderCircle, MessageCircle, Phone, PhoneCall, RefreshCw, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crmRequest } from "@/lib/crm/client";
import { followupBuckets, type FollowupBucket, type FollowupContext, type FollowupQueue as QueueData } from "@/lib/crm/followup";
import { appointmentStatuses, displayDate, sources, stages, type CRMRecord, type TeamMember } from "@/lib/crm/types";
import { FollowupRecorder } from "./followup-recorder";

function AppointmentLinker({ appointment, onClose, onLinked }: { appointment: CRMRecord; onClose: () => void; onLinked: () => void }) {
  const [rows, setRows] = useState<CRMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    crmRequest<{ rows: CRMRecord[] }>("list", { entity: "inquiries", contact_id: appointment.contact_id }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setRows(result.rows.filter(row => row.exam?.trim() === appointment.exam?.trim())); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [appointment.contact_id, appointment.exam]);
  async function link(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await crmRequest("link_appointment", { id: appointment.id, version: appointment.version, inquiry_id: selected });
      onLinked();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذّر الربط."); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent dir="rtl" className="crm-dialog"><DialogHeader>
    <DialogTitle>ربط الموعد بطلبه الموثّق</DialogTitle><DialogDescription>{appointment.contact_name} · {appointment.exam} · {displayDate(appointment.starts_at)}</DialogDescription>
  </DialogHeader><form className="crm-form" onSubmit={link}>
    <p className="crm-muted crm-full">اختر الطلب الذي نتج عنه هذا الموعد بعد مراجعة السجل. مصدر الطلب وتاريخه سيحددان احتساب النتيجة.</p>
    <label className="crm-field crm-full"><span>طلب الفحص لنفس جهة الاتصال</span><select required value={selected} disabled={loading || busy || !rows.length} onChange={e => setSelected(e.target.value)}>
      <option value="">{loading ? "جارٍ تحميل الطلبات…" : "اختر الطلب الموثّق"}</option>{rows.map(row => <option key={row.id} value={row.id}>{row.booking_reference || row.id.slice(0, 8)} · {displayDate(row.created_at, false)} · {sources[row.source || ""]} · {stages[row.stage || ""]}</option>)}
    </select></label>
    {!loading && !error && !rows.length && <p className="crm-report-note crm-full">لا يوجد طلب مطابق ضمن أحدث 50 طلبًا لجهة الاتصال. إذا لم يوجد طلب موثّق، يبقى الموعد منفصلًا عن قياس المصادر.</p>}
    {error && <p className="crm-error crm-full" role="alert">{error}</p>}
    <div className="crm-dialog-actions crm-full"><button type="submit" className="button primary" disabled={busy || loading || !selected}><Link2 size={16} />{busy ? "جارٍ الربط…" : "ربط الموعد"}</button><button type="button" className="button outline" disabled={busy} onClick={onClose}>إغلاق</button></div>
  </form></DialogContent></Dialog>;
}

export function FollowupQueue({ revision, staff, onEditInquiry, onEditAppointment, onEditTask, onFollow, onBook, onOpenContact, onChanged }: {
  revision: number;
  staff: TeamMember[];
  onEditInquiry: (record: CRMRecord) => void;
  onEditAppointment: (record: CRMRecord) => void;
  onEditTask: (record: CRMRecord) => void;
  onFollow: (record: CRMRecord) => void;
  onBook: (record: CRMRecord) => void;
  onOpenContact: (id: string) => void;
  onChanged: (message: string) => void;
}) {
  const [bucket, setBucket] = useState<FollowupBucket>("all");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<QueueData | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");
  const [linking, setLinking] = useState<CRMRecord | null>(null);
  const [recording, setRecording] = useState<FollowupContext | null>(null);
  const requestKey = JSON.stringify([bucket, page, revision, retry]);
  const loading = loadedKey !== requestKey;
  useEffect(() => {
    const controller = new AbortController();
    crmRequest<{ data: QueueData }>("conversion_queue", { bucket, page }, controller.signal)
      .then(result => { if (!controller.signal.aborted) {
        const lastPage = Math.max(1, Math.ceil(result.data.total / result.data.pageSize));
        if (result.data.page > lastPage) { setPage(lastPage); return; }
        setData(result.data); setError(""); setLoadedKey(requestKey);
      } })
      .catch(e => { if (!controller.signal.aborted) { setError(e.message); setLoadedKey(requestKey); } });
    return () => controller.abort();
  }, [bucket, page, requestKey]);
  function choose(value: FollowupBucket) { setBucket(value); setPage(1); }
  return <section className="panel crm-followup-queue" aria-label="قائمة ضبط التحويل والمتابعة">
    <div className="crm-panel-head"><div><span className="crm-section-kicker">الخطوة القادمة لكل طلب</span><h2>حالات تحتاج إجراء</h2><p>طلبات تحتاج متابعة، ومواعيد تحتاج تحديثًا أو ربطًا بطلبها.</p></div><button className="crm-refresh" aria-label="تحديث حالات المتابعة" onClick={() => setRetry(value => value + 1)}><RefreshCw size={15} />تحديث</button></div>
    <div className="crm-queue-filters" role="group" aria-label="تصفية حالات المتابعة">{Object.entries(followupBuckets).map(([key, label]) => <button key={key} aria-pressed={bucket === key} className={bucket === key ? "active" : ""} onClick={() => choose(key as FollowupBucket)}><span>{label}</span><strong>{loading || error ? "—" : data?.counts[key as FollowupBucket] ?? "—"}</strong></button>)}</div>
    {loading ? <div className="crm-loading"><LoaderCircle className="crm-spin" />جارٍ مراجعة الحالات…</div> : error ? <p className="crm-error" role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>إعادة المحاولة</button></p> : data && <>
      {data.rows.length ? <div className="crm-queue-list">{data.rows.map(item => {
        const row = item.record;
        const owner = staff.find(person => person.username === row.owner)?.display_name || row.owner;
        return <article className="crm-queue-row" key={item.entity + row.id}>
          <div className="crm-queue-person"><button className="crm-person" onClick={() => row.contact_id && onOpenContact(row.contact_id)}><span className="crm-avatar">{(row.contact_name || "س").slice(0, 1)}</span><span><strong>{row.contact_name}</strong><small>{row.exam}</small></span></button>
            <div className="crm-queue-flags">{item.flags.map(flag => <span key={flag} data-flag={flag}>{followupBuckets[flag]}</span>)}</div>
          </div>
          <div className="crm-queue-context">{item.entity === "inquiries" ? <><span>{sources[row.source || ""]} · {stages[row.stage || ""]}</span><small>أُضيف {displayDate(row.created_at)}</small><small><UserRound size={13} />{owner || "غير معيّن"}</small>{item.nextTask && <small>المتابعة: {displayDate(item.nextTask.due_at)}</small>}</> : <><span>{displayDate(row.starts_at)}</span><small>{appointmentStatuses[row.status || ""] || row.status}</small></>}</div>
          <div className="crm-queue-actions">{row.phone && <div className="crm-phone-actions"><a href={`tel:${row.phone}`} aria-label="اتصال هاتفي"><Phone size={16} /></a><a href={`https://wa.me/${row.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" aria-label="فتح واتساب"><MessageCircle size={16} /></a></div>}
            {item.entity === "inquiries" ? <><button className="crm-book" onClick={() => setRecording({ inquiry: row, task: item.nextTask })}><PhoneCall size={15} />تسجيل نتيجة</button><button className="crm-edit" onClick={() => onEditInquiry(row)}><ClipboardList size={15} />تحديث الطلب</button><button className="crm-edit" onClick={() => item.nextTask ? onEditTask(item.nextTask) : onFollow(row)}><ListChecks size={15} />{item.nextTask ? "تعديل المتابعة" : "جدولة متابعة"}</button>{["new", "contacting", "waiting", "cancelled"].includes(row.stage || "") && <button className="crm-book" onClick={() => onBook(row)}><CalendarDays size={15} />حجز موعد</button>}</> : <><button className="crm-edit" onClick={() => onEditAppointment(row)}><Check size={15} />تحديث الموعد</button>{item.flags.includes("unlinked") && <button className="crm-book" onClick={() => setLinking(row)}><Link2 size={15} />ربط بطلب</button>}</>}
          </div>
        </article>;
      })}</div> : <p className="crm-queue-empty"><ListChecks size={22} />{bucket === "all" ? "لا توجد حالات تحتاج إجراء حاليًا." : "لا توجد حالات في هذا التصنيف."}</p>}
      {data.total > data.pageSize && <div className="crm-pagination"><span>{data.total} سجلًا في التصنيف</span><div><button aria-label="حالات المتابعة السابقة" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronRight size={18} /></button><span>{page} / {Math.ceil(data.total / data.pageSize)}</span><button aria-label="حالات المتابعة التالية" disabled={page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}><ChevronLeft size={18} /></button></div></div>}
      <p className="crm-report-note">كل سجل يظهر مرة في القائمة، وقد ينتمي لأكثر من تصنيف. مراجعة الإلغاء وعدم الحضور تشمل آخر 30 يومًا.</p>
    </>}
    {linking && <AppointmentLinker appointment={linking} onClose={() => setLinking(null)} onLinked={() => { setLinking(null); onChanged("تم ربط الموعد بطلبه الموثّق"); }} />}
    {recording && <FollowupRecorder context={recording} staff={staff} onClose={() => setRecording(null)} onSaved={() => { setRecording(null); onChanged("تم تسجيل نتيجة التواصل والخطوة التالية"); }} />}
  </section>;
}
