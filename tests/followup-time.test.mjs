import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextReceptionFollowup} from '../lib/crm/followup.ts';

test('suggested followups respect Riyadh reception hours and Friday closure', () => {
  for (const [input, expected] of [
    ['2026-10-05T10:00:00+03:00', '2026-10-05T07:15:00.000Z'],
    ['2026-10-05T02:00:00+03:00', '2026-10-05T06:00:00.000Z'],
    ['2026-10-08T20:55:00+03:00', '2026-10-10T06:00:00.000Z'],
    ['2026-10-09T12:00:00+03:00', '2026-10-10T06:00:00.000Z'],
    ['2026-10-10T21:00:00+03:00', '2026-10-11T06:00:00.000Z'],
  ]) assert.equal(nextReceptionFollowup(new Date(input)), expected);
});
