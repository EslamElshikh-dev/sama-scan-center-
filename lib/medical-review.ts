import type { PublicContent } from "./growth";

export type VerifiedReview = { review: PublicContent; clinician: PublicContent };

// Public attribution describes an actual review of this exact content revision.
export function findVerifiedReview(
  entries: PublicContent[],
  reviewId: string,
  contentVersion: string,
  today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date()),
): VerifiedReview | null {
  const review = entries.find(entry => entry.kind === "review" && entry.id === reviewId);
  const reviewedAt = review?.data.reviewedAt;
  if (!review || review.data.contentVersion !== contentVersion || !reviewedAt ||
      !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt) || reviewedAt < contentVersion || reviewedAt > today) return null;
  const parsed = new Date(`${reviewedAt}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== reviewedAt) return null;
  const clinician = entries.find(entry => entry.kind === "clinician" && entry.id === review.data.reviewerId);
  if (!clinician || !["name", "specialty", "qualification"].every(key => clinician.data[key]?.trim())) return null;
  return { review, clinician };
}

export function formatContentDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Riyadh",
  }).format(new Date(`${value}T12:00:00+03:00`));
}
