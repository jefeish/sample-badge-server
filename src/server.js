'use strict';

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const { makeBadge } = require('badge-maker');

const PORT = Number(process.env.PORT) || 3000;
const BADGE_USER = process.env.BADGE_USER || 'demo';
const BADGE_PASSWORD = process.env.BADGE_PASSWORD || 's3cret';

const ALLOWED_STYLES = new Set([
  'plastic',
  'flat',
  'flat-square',
  'for-the-badge',
  'social'
]);

const MAX_TEXT_LENGTH = 64;
// badge-maker accepts CSS color names and hex codes; restrict to that shape.
const COLOR_PATTERN = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,20})$/;

/** Constant-time string comparison that does not leak length. */
function safeEqual(a, b) {
  const digestA = crypto.createHash('sha256').update(String(a)).digest();
  const digestB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

function isAuthorized(body) {
  const user = typeof body.user === 'string' ? body.user : '';
  const password = typeof body.password === 'string' ? body.password : '';
  // Evaluate both comparisons so the result does not short-circuit on username.
  const userOk = safeEqual(user, BADGE_USER);
  const passwordOk = safeEqual(password, BADGE_PASSWORD);
  return userOk && passwordOk;
}

function pickText(value, fallback) {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  return value.slice(0, MAX_TEXT_LENGTH);
}

function pickColor(value, fallback) {
  if (typeof value !== 'string' || !COLOR_PATTERN.test(value)) return fallback;
  return value;
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
const staticFiles = express.static(path.join(__dirname, '..', 'public'));
app.use(staticFiles);
// Also served under the prefix so the UI works when a proxy forwards /badge-server unchanged.
app.use('/badge-server', staticFiles);

// Open CORS: the endpoint takes no cookies or auth headers, credentials travel in the body.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '600');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Root is included because a reverse proxy may strip the /badge-server prefix.
const BADGE_PATHS = ['/', '/badge-server'];

app.post(BADGE_PATHS, (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  if (!isAuthorized(body)) {
    return res.status(401).type('application/json').send({ error: 'invalid credentials' });
  }

  const style = ALLOWED_STYLES.has(body.style) ? body.style : 'flat';

  let svg;
  try {
    svg = makeBadge({
      label: pickText(body.label, 'build'),
      message: pickText(body.message, 'passing'),
      labelColor: pickColor(body.labelColor, '#555'),
      color: pickColor(body.color, 'green'),
      style
    });
  } catch (err) {
    return res.status(400).type('application/json').send({ error: 'could not render badge' });
  }

  res.status(200);
  res.type('image/svg+xml');
  res.set('Cache-Control', 'no-store');
  res.send(svg);
});

// Any other method on a badge path is rejected explicitly.
app.all(BADGE_PATHS, (req, res) => {
  res.set('Allow', 'POST');
  res.status(405).type('application/json').send({ error: 'only POST is supported' });
});

app.use((req, res) => {
  res.status(404).type('application/json').send({ error: 'not found' });
});

// Body-parser and unexpected errors land here.
app.use((err, req, res, next) => {
  const status = err.status && err.status < 500 ? err.status : 500;
  res.status(status).type('application/json').send({ error: 'request could not be processed' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`badge server listening on http://localhost:${PORT}`);
    console.log(`test page: http://localhost:${PORT}/  ·  endpoint: POST /badge-server`);
  });
}

module.exports = app;
