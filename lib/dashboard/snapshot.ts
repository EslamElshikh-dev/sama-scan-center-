// Verified administrative report, issued 2026-09-29. These values are a fixed snapshot,
// not a live provider response. Keep periods and provenance beside every comparison.
export const snapshot = {
  issued: "2026-09-29",
  source: "تقرير أداء مركز سما سكان للأشعة، إصدار 29 سبتمبر 2026",
  google: {
    current: { from: "2026-08-26", to: "2026-09-26", days: 32, calls: 118, directions: 284, views: 1267, website: 33 },
    previous: { from: "2026-07-25", to: "2026-08-25", days: 32, calls: 18, directions: 93, views: 271, website: 3 },
    mobileShare: 92.7,
  },
  search: {
    through: "2026-09-29", clicks: 16, impressions: 741, ctr: 2.16, position: 7.71,
    week: { previous: { from: "2026-09-12", to: "2026-09-18", clicks: 10, impressions: 261 }, current: { from: "2026-09-19", to: "2026-09-25", clicks: 5, impressions: 342 } },
  },
  // Separate GBP review, also dated 2026-09-29. This is Google profile chat,
  // not a measured WhatsApp click or a confirmed conversation.
  chat: { through: "2026-09-29", septemberClicks: 9, source: "مراجعة ملف سما سكان التجاري، 29 سبتمبر 2026" },
  posts: { count: 13, callCta: 4, learnMoreCta: 9, through: "2026-09-29" },
} as const;

export function percentChange(current: number, previous: number) {
  return previous > 0 ? (current - previous) / previous * 100 : null;
}
