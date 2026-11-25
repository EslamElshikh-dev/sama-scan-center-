/**
 * Sama Scan: read-only Google Ads Scripts diagnostics.
 * Run inside customer 289-897-8192. Logs the last 14 completed Riyadh days.
 * Copy each CSV block from the execution log for the keyword review.
 * No campaign, budget, bidding, asset, conversion or external-service writes.
 * References: https://developers.google.com/google-ads/scripts/docs/concepts/reports
 */
/* global AdsApp, Utilities */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Google Ads Scripts calls this entry point.
function main() {
  var account = AdsApp.currentAccount();
  if (account.getCustomerId().replace(/\D/g, '') !== '2898978192') {
    throw new Error('Wrong account: run only inside 289-897-8192. No reports were queried.');
  }
  if (account.getTimeZone() !== 'Asia/Riyadh' || account.getCurrencyCode() !== 'SAR') {
    throw new Error('Expected Riyadh account time and SAR. No reports were queried.');
  }
  var today = Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd');
  var offset = function (days) {
    var date = new Date(today + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  var start = offset(-14), end = offset(-1);
  var where = 'campaign.id = 24332875672 AND segments.date BETWEEN ' +
    "'" + start + "' AND '" + end + "'";
  var stats = ['metrics.impressions', 'metrics.clicks', 'metrics.cost_micros', 'metrics.conversions'];
  var reports = [
    {
      name: 'DAILY', from: 'campaign',
      fields: ['segments.date', 'campaign.id', 'campaign.name'].concat(stats),
      order: 'segments.date ASC'
    },
    {
      name: 'KEYWORDS', from: 'keyword_view',
      fields: ['campaign.id', 'ad_group.id', 'ad_group.name',
        'ad_group_criterion.criterion_id', 'ad_group_criterion.keyword.text',
        'ad_group_criterion.keyword.match_type', 'ad_group_criterion.status',
        'ad_group_criterion.quality_info.quality_score',
        'ad_group_criterion.quality_info.creative_quality_score',
        'ad_group_criterion.quality_info.post_click_quality_score',
        'ad_group_criterion.quality_info.search_predicted_ctr'].concat(stats),
      order: 'metrics.cost_micros DESC'
    },
    {
      name: 'SEARCH_TERMS', from: 'search_term_view',
      fields: ['campaign.id', 'ad_group.id', 'ad_group.name',
        'search_term_view.search_term', 'search_term_view.status',
        'segments.keyword.info.text', 'segments.keyword.info.match_type'].concat(stats),
      order: 'metrics.cost_micros DESC'
    },
    {
      name: 'HOURLY', from: 'campaign',
      fields: ['segments.date', 'segments.hour', 'campaign.id'].concat(stats),
      order: 'segments.date ASC, segments.hour ASC'
    }
  ];
  var camel = function (text) { return text.replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); }); };
  var read = function (row, field) {
    var value = field.split('.').map(camel).reduce(function (part, key) {
      return part === undefined || part === null ? undefined : part[key];
    }, row);
    if (value === undefined || value === null) return '';
    if (field === 'ad_group_criterion.quality_info.quality_score' && Number(value) === 0) return '';
    if (field === 'metrics.cost_micros') return (Number(value) / 1000000).toFixed(6);
    return value;
  };
  var csv = function (value) {
    var text = String(value);
    // Keep text safe if a CSV is later opened in spreadsheet software.
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  console.log('READ_ONLY | campaign=24332875672 | currency=SAR | dates=' + start + '..' + end);
  console.log('Conversions are attributed contact-button actions, not confirmed bookings.');
  reports.forEach(function (report) {
    console.log('BEGIN ' + report.name);
    try {
      var query = 'SELECT ' + report.fields.join(', ') + ' FROM ' + report.from +
        ' WHERE ' + where + ' AND metrics.impressions > 0 ORDER BY ' + report.order + ' LIMIT 501';
      var iterator = AdsApp.search(query);
      console.log(report.fields.map(function (field) { return csv(field === 'metrics.cost_micros' ? 'cost_SAR' : field); }).join(','));
      var count = 0;
      while (iterator.hasNext()) {
        if (count === 500) {
          console.log('TRUNCATED: more than 500 rows. Export the full report before calculating totals.');
          break;
        }
        var row = iterator.next();
        console.log(report.fields.map(function (field) { return csv(read(row, field)); }).join(','));
        count++;
      }
      console.log('ROWS ' + count);
    } catch (error) {
      console.log('REPORT_FAILED ' + report.name + ': ' + String(error.message || error));
    }
    console.log('END ' + report.name);
  });
}
