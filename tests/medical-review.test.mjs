import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findVerifiedReview } from '../lib/medical-review.ts';

const clinician = { id: 'clinician-example', kind: 'clinician', confirmedAt: '2026-11-12', data: { name: 'اسم للاختبار المحلي', specialty: 'الأشعة', qualification: 'مؤهل موثق للاختبار' } };
const review = { id: 'review-service-mri-riyadh', kind: 'review', confirmedAt: '2026-11-12', data: { reviewerId: clinician.id, reviewedAt: '2026-11-12', contentVersion: '2026-11-12' } };
const find = entries => findVerifiedReview(entries, review.id, '2026-11-12', '2026-11-12');

test('medical attribution requires both a current review and its approved public clinician', () => {
  assert.equal(find([]), null);
  assert.equal(find([review]), null);
  assert.equal(find([clinician]), null);
  assert.equal(find([clinician, review]).clinician.id, clinician.id);
});
test('changing the page revision, revoking the clinician or future dating a review hides attribution', () => {
  assert.equal(findVerifiedReview([clinician, review], review.id, '2026-11-13', '2026-11-13'), null);
  assert.equal(find([review]), null);
  assert.equal(find([clinician, { ...review, data: { ...review.data, reviewedAt: '2026-11-13' } }]), null);
  assert.equal(find([clinician, { ...review, data: { ...review.data, reviewedAt: '2026-11-11' } }]), null);
});
test('a missing qualification or an invalid calendar date is never displayed as a verified review', () => {
  assert.equal(find([{ ...clinician, data: { ...clinician.data, qualification: '' } }, review]), null);
  const invalid = { ...review, data: { ...review.data, reviewedAt: '2026-02-31', contentVersion: '2026-01-01' } };
  assert.equal(findVerifiedReview([clinician, invalid], review.id, '2026-01-01', '2026-11-12'), null);
});
