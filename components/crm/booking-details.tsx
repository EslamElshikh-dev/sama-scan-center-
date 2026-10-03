import { displayDate, periodLabels, trafficLabels, type BookingMetadata } from "@/lib/crm/types";

export function BookingDetails({ record }: { record: BookingMetadata }) {
  if (!record.booking_reference) return null;
  return <div className="crm-booking-details crm-full">
    <strong>طلب الموقع <span dir="ltr">{record.booking_reference}</span></strong>
    <p>تفضيل المراجع: {record.requested_date ? displayDate(`${record.requested_date}T12:00:00+03:00`, false) : "—"} · {periodLabels[record.requested_period || ""] || "—"}</p>
    <small>مصدر الوصول: {trafficLabels[record.attribution?.channel || ""] || "الموقع"}{record.attribution?.campaign && ` · ${record.attribution.campaign}`}</small>
    <p>التفضيل لا يؤكد التوفر. راجع الفحص والوقت مع المراجع، ثم سجّل الموعد وحالته.</p>
  </div>;
}
