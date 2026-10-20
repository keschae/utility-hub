import { Router } from 'express';

/**
 * Utility One -- text transformation toolkit. OPEN to any authenticated user.
 */
const router = Router();

const TRANSFORMS = {
  upper: (s) => s.toUpperCase(),
  lower: (s) => s.toLowerCase(),
  title: (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()),
  reverse: (s) => [...s].reverse().join(''),
  slug: (s) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
  base64: (s) => Buffer.from(s, 'utf8').toString('base64'),
};

router.get('/meta', (req, res) => {
  res.json({ transforms: Object.keys(TRANSFORMS) });
});

router.post('/transform', (req, res) => {
  const { text = '', transform = 'upper' } = req.body ?? {};

  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'bad_request', message: '`text` must be a string.' });
  }
  if (text.length > 10_000) {
    return res.status(413).json({ error: 'payload_too_large', message: 'Max 10000 characters.' });
  }
  const fn = TRANSFORMS[transform];
  if (!fn) {
    return res.status(400).json({
      error: 'bad_request',
      message: `Unknown transform '${transform}'.`,
      allowed: Object.keys(TRANSFORMS),
    });
  }

  const result = fn(text);
  res.json({
    transform,
    input: text,
    result,
    stats: {
      characters: text.length,
      words: text.trim() ? text.trim().split(/\s+/).length : 0,
      lines: text ? text.split('\n').length : 0,
    },
    ranBy: req.principal.name,
  });
});

export default router;
