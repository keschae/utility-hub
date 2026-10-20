import { Router } from 'express';

/**
 * Utility Three -- bulk record reconciliation. RESTRICTED: Utility3.Access.
 *
 * Compares two sets of keyed records and reports matches, mismatches and
 * orphans on either side. Stands in for the kind of back-office job that is
 * typically role-gated.
 */
const router = Router();

function indexRecords(rows, keyField) {
  const map = new Map();
  const duplicates = [];
  for (const row of rows) {
    const key = String(row?.[keyField] ?? '').trim();
    if (!key) continue;
    if (map.has(key)) duplicates.push(key);
    else map.set(key, row);
  }
  return { map, duplicates };
}

router.post('/reconcile', (req, res) => {
  const {
    source = [],
    target = [],
    keyField = 'id',
    compareField = 'amount',
  } = req.body ?? {};

  if (!Array.isArray(source) || !Array.isArray(target)) {
    return res.status(400).json({
      error: 'bad_request',
      message: '`source` and `target` must be arrays of objects.',
    });
  }
  if (source.length > 5000 || target.length > 5000) {
    return res.status(413).json({ error: 'payload_too_large', message: 'Max 5000 rows per side.' });
  }

  const s = indexRecords(source, keyField);
  const t = indexRecords(target, keyField);

  const matched = [];
  const mismatched = [];
  const missingInTarget = [];

  for (const [key, sRow] of s.map) {
    const tRow = t.map.get(key);
    if (!tRow) {
      missingInTarget.push(key);
      continue;
    }
    const a = sRow?.[compareField];
    const b = tRow?.[compareField];
    // Compare numerically when both sides parse as numbers, else stringwise.
    const bothNumeric = Number.isFinite(Number(a)) && Number.isFinite(Number(b));
    const equal = bothNumeric ? Number(a) === Number(b) : String(a) === String(b);
    if (equal) matched.push(key);
    else mismatched.push({ key, source: a, target: b });
  }

  const missingInSource = [...t.map.keys()].filter((k) => !s.map.has(k));

  res.json({
    keyField,
    compareField,
    summary: {
      sourceRows: source.length,
      targetRows: target.length,
      matched: matched.length,
      mismatched: mismatched.length,
      missingInTarget: missingInTarget.length,
      missingInSource: missingInSource.length,
      duplicateKeys: s.duplicates.length + t.duplicates.length,
    },
    matched,
    mismatched,
    missingInTarget,
    missingInSource,
    duplicateKeys: { source: s.duplicates, target: t.duplicates },
    ranBy: req.principal.name,
  });
});

export default router;
