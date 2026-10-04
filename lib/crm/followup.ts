import type { CRMRecord } from "./types";

export const followupBuckets = {
  all: "كل الحالات",
  intake: "طلبات الموقع",
  overdue: "متابعة متأخرة",
  no_followup: "بلا متابعة",
  unassigned: "بلا مسؤول نشط",
  unresolved: "نتيجة الموعد معلّقة",
  unlinked: "موعد بلا طلب",
  recovery: "مراجعة الإلغاء وعدم الحضور",
} as const;
export type FollowupBucket = keyof typeof followupBuckets;
export type FollowupFlag = Exclude<FollowupBucket, "all">;
export type FollowupItem = {
  entity: "inquiries" | "appointments";
  record: CRMRecord;
  flags: FollowupFlag[];
  nextTask: CRMRecord | null;
};
export type FollowupQueue = {
  counts: Record<FollowupBucket, number>;
  rows: FollowupItem[];
  total: number;
  page: number;
  pageSize: number;
  updatedAt: string;
};

// Suggest the next followup during the center's existing Sat–Thu, 09:00–21:00 hours.
export function nextReceptionFollowup(now = new Date(), delayMinutes = 15) {
  const local = new Date(now.getTime() + (180 + delayMinutes) * 60_000);
  while (true) {
    if (local.getUTCDay() === 5 || local.getUTCHours() >= 21) {
      local.setUTCDate(local.getUTCDate() + 1);
      local.setUTCHours(9, 0, 0, 0);
    } else if (local.getUTCHours() < 9) {
      local.setUTCHours(9, 0, 0, 0);
    } else {
      return new Date(local.getTime() - 180 * 60_000).toISOString();
    }
  }
}
