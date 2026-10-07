import Image from "next/image";
import { getVerifiedContent } from "@/lib/verified-content";

export async function VerifiedServiceDetails({ slug }: { slug: string }) {
  const entry = (await getVerifiedContent()).find(item => item.kind === "service" && item.id === slug);
  if (!entry) return null;
  const facts = [["الفحوص المتاحة", entry.data.supportedExams], ["التحضير الذي يؤكده الفريق", entry.data.preparation], ["إصدار الصور والتقرير", entry.data.reportProcess], ["مدة الموعد", entry.data.duration]].filter(([, value]) => value);
  return <section className="section verified-service" aria-labelledby="verified-service-title"><div className="container">
    <div className="section-head"><span className="eyebrow">تفاصيل الفحص في سما سكان</span><h2 id="verified-service-title">معلومات أكدها فريق المركز</h2><p>آخر تأكيد: <time dateTime={entry.confirmedAt}>{entry.confirmedAt}</time>. تُراجع التعليمات الخاصة بحالتك عند تأكيد الموعد.</p></div>
    <div className="booking-info-grid">{facts.map(([title, value]) => <article key={title}><h3>{title}</h3><p className="verified-lines">{value}</p></article>)}</div>
    {entry.data.devicePhoto && <figure className="verified-device"><Image src={entry.data.devicePhoto} alt="صورة جهاز الفحص في مركز سما سكان" width={1200} height={800} sizes="(max-width: 900px) 100vw, 70vw"/><figcaption>صورة الجهاز التي أكدها فريق المركز.</figcaption></figure>}
  </div></section>;
}

export async function VerifiedMedicalTeam() {
  const team = (await getVerifiedContent()).filter(item => item.kind === "clinician");
  if (!team.length) return null;
  return <section className="section" aria-labelledby="medical-team-title"><div className="container"><div className="section-head"><span className="eyebrow">الفريق الطبي</span><h2 id="medical-team-title">تعرف على مختصي المركز</h2></div><div className="values-grid">{team.map(item => <article id={`clinician-${item.id}`} key={item.id}><h3>{item.data.name}</h3><p>{item.data.specialty}</p><p>{item.data.qualification}</p></article>)}</div></div></section>;
}
