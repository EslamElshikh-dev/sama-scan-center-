import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outcomeCSV } from '../lib/crm/outcome-export.ts';

test('outcome exports retain cohort, age, pending and result counts without enabling spreadsheet formulas', () => {
  const report = {from:'2026-10-01',to:'2026-10-05',updatedAt:'2026-10-05T01:00:00Z'};
  const row = {inquiries:10,booked:6,attended:3,completed:2,older:4,olderCompleted:1,future:2,awaitingExam:1,unresolved:1,no_show:2,cancelled:1};
  const csv = outcomeCSV(report, [row], () => '=SUM(1,2) "اختبار"');
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"'=SUM\(1,2\) ""اختبار"""/);
  assert.match(csv, /,"10","6","3","2","4","1","2","1","1","2","1","2026-10-01","2026-10-05","2026-10-05T01:00:00Z"/);
  assert.equal(csv.split('\r\n').length, 2);
});
