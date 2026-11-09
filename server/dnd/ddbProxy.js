// server/dnd/ddbProxy.js
// GET /dnd/ddb/:id -> the public D&D Beyond character JSON, for The Hollow Crown's web build.
// D&D Beyond sends no CORS headers, so the browser can't fetch it directly. Only numeric IDs are
// accepted and the target host is fixed, so this can't be used as an open proxy.
const express = require('express');

const DDB_URL = 'https://character-service.dndbeyond.com/character/v5/character/';
const ID = /^\d{1,12}$/;

function createDdbProxy({ fetchImpl = fetch, limit = 10, windowMs = 60_000, now = Date.now, timeoutMs = 15_000 } = {}) {
  const router = express.Router();
  const hits = new Map(); // client ip -> { start, count }

  function limited(ip) {
    const t = now();
    const h = hits.get(ip);
    if (!h || t - h.start >= windowMs) {
      if (hits.size > 10_000) {
        for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k);
      }
      hits.set(ip, { start: t, count: 1 });
      return false;
    }
    h.count += 1;
    return h.count > limit;
  }

  router.get('/ddb/:id', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!ID.test(req.params.id)) return res.status(400).json({ error: 'bad character id' });
    if (limited(req.ip)) return res.status(429).json({ error: 'too many requests' });
    try {
      const r = await fetchImpl(DDB_URL + req.params.id, {
        headers: { 'User-Agent': 'hollow-crown-proxy', Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      res.status(r.status).type('application/json').send(await r.text());
    } catch (e) {
      res.status(502).json({ error: 'D&D Beyond unreachable' });
    }
  });

  return router;
}

module.exports = { createDdbProxy, DDB_URL };
