export const samaCampaignKey = "sama_search_riyadh_202610";
export type SpendDay = { day: string; amount: number | null; evidence: string | null; origin: "ads_snapshot" | "reviewed" | null; version: number; updatedAt: string | null };
export type BookingCostMetrics = { inquiries: number; calls: number; whatsapp: number; forms: number; confirmed: number; attended: number; completed: number };
export type BookingCostReport = {
  from: string; to: string; updatedAt: string; currency: "SAR"; campaignId: string; campaignKey: string;
  days: SpendDay[]; services: (BookingCostMetrics & { exam: string })[]; metrics: BookingCostMetrics;
  gaps: { unassignedAds: number; otherCampaigns: number; unknownReceived: number };
  coveredDays: number; totalDays: number; snapshotDays: number; spend: number | null; costPerConfirmed: number | null;
};
export function recentClosedDays(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const end = new Date(`${today}T12:00:00Z`); end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}
