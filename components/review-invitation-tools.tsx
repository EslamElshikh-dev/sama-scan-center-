"use client";

import { useState } from "react";
import { reviewInvitation } from "@/lib/reviews";

export function ReviewInvitationTools() {
  const [message, setMessage] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(reviewInvitation); setMessage("تم نسخ الدعوة. أرسلها يدويًا بعد اكتمال الزيارة."); }
    catch { setMessage("تعذّر النسخ التلقائي. يمكنك تحديد النص ونسخه من الحقل."); }
  }
  return <section className="panel growth-panel"><div className="crm-panel-head"><div><span className="crm-section-kicker">بعد الزيارة · دعوة اختيارية</span><h2>دعوة موحدة لمشاركة التجربة</h2><p>تُعرض الدعوة على المراجعين بالطريقة نفسها، سواء كانت تجربتهم إيجابية أو لديهم ملاحظات.</p></div></div>
    <label className="crm-field"><span>نص الدعوة الجاهز</span><textarea readOnly rows={8} value={reviewInvitation} /></label>
    <div className="crm-dialog-actions"><button type="button" className="button primary" onClick={copy}>نسخ الدعوة</button><a className="button" href="/sama-scan-review-card.pdf" target="_blank" rel="noreferrer">بطاقة QR للطباعة</a><a className="button" href="/review" target="_blank" rel="noreferrer">معاينة صفحة الدعوة</a></div>
    <p role="status">{message}</p>
    <ol><li>تُرسل مرة بعد اكتمال الزيارة، وتبقى المشاركة اختيارية.</li><li>لا يُطلب عدد نجوم محدد، ولا تُربط الدعوة بخصم أو هدية.</li><li>لا تُطلب تفاصيل الفحص أو الحالة الصحية في المراجعة العامة.</li><li>تُراجع الردود الجديدة بانتظام، ويكون الرد على التجربة نفسها دون كشف معلومات المراجع.</li></ol>
  </section>;
}
