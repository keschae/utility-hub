import { Router } from 'express';

/**
 * Utility Two -- unit & data-size converter. OPEN to any authenticated user.
 */
const router = Router();

// Conversions are expressed as a factor to a canonical base unit per family,
// which keeps the conversion logic to a single multiply/divide.
const FAMILIES = {
  length: {
    base: 'm',
    units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, mi: 1609.344 },
  },
  mass: {
    base: 'kg',
    units: { g: 0.001, kg: 1, t: 1000, oz: 0.0283495, lb: 0.453592 },
  },
  data: {
    base: 'B',
    units: {
      B: 1,
      KiB: 1024,
      MiB: 1024 ** 2,
      GiB: 1024 ** 3,
      TiB: 1024 ** 4,
      kB: 1000,
      MB: 1000 ** 2,
      GB: 1000 ** 3,
    },
  },
  duration: {
    base: 's',
    units: { ms: 0.001, s: 1, min: 60, h: 3600, d: 86400, wk: 604800 },
  },
};

router.get('/meta', (req, res) => {
  res.json({
    families: Object.fromEntries(
      Object.entries(FAMILIES).map(([k, v]) => [k, Object.keys(v.units)])
    ),
  });
});

router.post('/convert', (req, res) => {
  const { value, from, to, family } = req.body ?? {};

  const fam = FAMILIES[family];
  if (!fam) {
    return res.status(400).json({
      error: 'bad_request',
      message: `Unknown family '${family}'.`,
      allowed: Object.keys(FAMILIES),
    });
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return res.status(400).json({ error: 'bad_request', message: '`value` must be a finite number.' });
  }
  if (!(from in fam.units) || !(to in fam.units)) {
    return res.status(400).json({
      error: 'bad_request',
      message: `'${from}' or '${to}' is not a valid ${family} unit.`,
      allowed: Object.keys(fam.units),
    });
  }

  const result = (numeric * fam.units[from]) / fam.units[to];
  res.json({
    family,
    input: { value: numeric, unit: from },
    output: { value: result, unit: to },
    // Keep a readable form for display without losing precision above.
    formatted: `${numeric} ${from} = ${Number(result.toPrecision(12))} ${to}`,
    ranBy: req.principal.name,
  });
});

export default router;
