import type { OutcomeRow, SourceReport } from "./types";

function csvCell(value: string | number) {
  const raw = String(value);
  const safe = typeof value === "string" && (/^\s*[=+@-]/.test(raw) || /^[\t\r]/.test(raw)) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export function outcomeCSV(report: SourceReport, rows: OutcomeRow[], label: (row: OutcomeRow) => string) {
  const header = ["الفحص أو المصدر", "طلبات", "لها حجز", "انتهت بحضور", "أُجري الفحص", "طلبات عمرها 7 أيام أو أكثر", "أُجري فحصها من الطلبات الأقدم", "حجوزات مستقبلية", "حضر والفحص غير مسجل", "نتيجة موعد معلقة", "مواعيد عدم حضور", "مواعيد ملغاة", "الفترة من", "الفترة إلى", "القياس حتى"];
  const values = rows.map(row => [label(row), row.inquiries, row.booked, row.attended, row.completed, row.older, row.olderCompleted, row.future, row.awaitingExam, row.unresolved, row.no_show, row.cancelled, report.from, report.to, report.updatedAt]);
  return "\uFEFF" + [header, ...values].map(row => row.map(csvCell).join(",")).join("\r\n");
}
