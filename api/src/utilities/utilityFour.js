import { Router } from 'express';

/**
 * Utility Four -- financial export generator. RESTRICTED: Utility4.Access.
 *
 * Produces a CSV/JSON export with subtotals. Demonstrates a restricted utility
 * that returns a file download rather than JSON for the UI to render.
 */
const router = Router();

const SAMPLE_LEDGER = [
  { date: '2026-01-14', account: '4000-Revenue', memo: 'Subscription — Acme', amount: 12500.0 },
  { date: '2026-01-22', account: '4000-Revenue', memo: 'Subscription — Globex', amount: 8400.5 },
  { date: '2026-02-03', account: '5000-COGS', memo: 'Hosting', amount: -2310.75 },
  { date: '2026-02-11', account: '6000-OpEx', memo: 'Travel', amount: -1875.2 },
  { date: '2026-02-28', account: '4000-Revenue', memo: 'Services — Initech', amount: 15000.0 },
  { date: '2026-03-09', account: '5000-COGS', memo: 'Support tooling', amount: -940.0 },
];

function toCsv(rows) {
  const headers = ['date', 'account', 'memo', 'amount'];
  const escape = (v) => {
    const s = String(v ?? '');
    // RFC 4180: quote when the field contains a comma, quote or newline.
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

router.get('/preview', (req, res) => {
  const byAccount = {};
  for (const row of SAMPLE_LEDGER) {
    byAccount[row.account] = (byAccount[row.account] ?? 0) + row.amount;
  }
  const net = SAMPLE_LEDGER.reduce((sum, r) => sum + r.amount, 0);

  res.json({
    rows: SAMPLE_LEDGER,
    subtotals: Object.entries(byAccount).map(([account, total]) => ({
      account,
      total: Number(total.toFixed(2)),
    })),
    net: Number(net.toFixed(2)),
    ranBy: req.principal.name,
  });
});

router.get('/export', (req, res) => {
  const format = String(req.query.format ?? 'csv').toLowerCase();

  if (format === 'json') {
    res.setHeader('Content-Disposition', 'attachment; filename="ledger-export.json"');
    return res.json(SAMPLE_LEDGER);
  }
  if (format !== 'csv') {
    return res
      .status(400)
      .json({ error: 'bad_request', message: "format must be 'csv' or 'json'." });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ledger-export.csv"');
  res.send(toCsv(SAMPLE_LEDGER));
});

export default router;
