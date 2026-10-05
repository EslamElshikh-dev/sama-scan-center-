"use client";

import { useState } from "react";
import { Check, Clock3, LoaderCircle, PhoneCall } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { crmRequest } from "@/lib/crm/client";
import { followupOutcomes, nextReceptionFollowup, type FollowupContext } from "@/lib/crm/followup";
import { displayDate, localInput, type FollowupOutcome, type TeamMember } from "@/lib/crm/types";

export function FollowupRecorder({ context, staff, onClose, onSaved }: {
  context: FollowupContext; staff: TeamMember[]; onClose: () => void; onSaved: () => void;
}) {
  const { inquiry, task } = context;
  const [outcome, setOutcome] = useState<FollowupOutcome>("reached");
  const [nextStep, setNextStep] = useState("followup");
  const [due, setDue] = useState(() => localInput(nextReceptionFollowup()));
  const [owner, setOwner] = useState(task?.owner || inquiry.owner || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsNext = outcome === "no_answer" || outcome === "needs_time" || outcome === "reached" && nextStep === "followup";
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await crmRequest("record_followup", {
        inquiry_id: inquiry.id, inquiry_version: inquiry.version,
        task_id: task?.id, task_version: task?.version,
        outcome, outcome_note: note.trim(), next_step: needsNext ? "followup" : "done",
        next_due_at: needsNext ? new Date(due + ":00+03:00").toISOString() : undefined,
        owner: needsNext ? owner : undefined,
      });
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذّر تسجيل النتيجة."); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent dir="rtl" className="crm-dialog"><DialogHeader>
    <span className="eyebrow">نتيجة التواصل والخطوة القادمة</span><DialogTitle>تسجيل نتيجة المتابعة</DialogTitle>
    <DialogDescription>{inquiry.contact_name} · {inquiry.exam}{task && " · " + task.title}</DialogDescription>
  </DialogHeader><form className="crm-form" onSubmit={save}>
    <fieldset className="crm-full crm-followup-choices"><legend>ماذا حدث في التواصل؟</legend>{Object.entries(followupOutcomes).map(([key, label]) => <label key={key}><input type="radio" name="followup-outcome" value={key} checked={outcome === key} onChange={() => setOutcome(key as FollowupOutcome)} disabled={busy} /><span>{label}</span></label>)}</fieldset>
    <label className="crm-field crm-full"><span>تفاصيل النتيجة{["reached", "declined"].includes(outcome) ? " *" : " · اختياري"}</span><textarea value={note} onChange={e => setNote(e.target.value)} required={["reached", "declined"].includes(outcome)} minLength={2} maxLength={500} rows={3} placeholder="سجّل ما حدث والخطوة المتفق عليها مع العميل" disabled={busy} /></label>
    {outcome === "reached" && <label className="crm-field crm-full"><span>الخطوة التالية</span><select value={nextStep} onChange={e => setNextStep(e.target.value)} disabled={busy}><option value="followup">تحديد متابعة قادمة</option><option value="done">إنهاء هذه المتابعة</option></select><small>الطلب المفتوح يحتاج موعدًا قائمًا أو متابعة قادمة قبل إنهاء هذه المتابعة.</small></label>}
    {needsNext && <><label className="crm-field"><span>المتابعة القادمة · الرياض *</span><input type="datetime-local" required value={due} onChange={e => setDue(e.target.value)} disabled={busy} /><small>السبت–الخميس، 9 صباحًا إلى 9 مساءً.</small></label><label className="crm-field"><span>مسؤول المتابعة القادمة *</span><select required value={owner} onChange={e => setOwner(e.target.value)} disabled={busy}><option value="">اختر مسؤولًا</option>{staff.map(person => <option key={person.username} value={person.username}>{person.display_name}</option>)}</select></label><div className="crm-followup-preview crm-full"><Clock3 size={18} /><span>ستُحفظ نتيجة التواصل وتُنشأ المتابعة القادمة معًا.<strong>{displayDate(due ? due + ":00+03:00" : undefined)}</strong></span></div></>}
    {outcome === "declined" && <p className="crm-attribution-gap crm-full">سيُسجّل رفض الاستكمال ويصبح الطلب ملغيًا. إذا كان له موعد قائم، حدّث الموعد أولًا بعد مراجعة العميل.</p>}
    {!needsNext && outcome !== "declined" && <p className="crm-report-note crm-full">تسجيل التواصل لا يؤكد الحجز ولا يسجّل الحضور أو إجراء الفحص.</p>}
    {error && <p className="crm-error crm-full" role="alert">{error}</p>}
    <div className="crm-dialog-actions crm-full"><button className="button primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="crm-spin" /> : <PhoneCall size={17} />}{busy ? "جارٍ الحفظ…" : needsNext ? "حفظ النتيجة والمتابعة" : "حفظ النتيجة"}</button><button className="button outline" type="button" disabled={busy} onClick={onClose}><Check size={15} />إغلاق</button></div>
  </form></DialogContent></Dialog>;
}
