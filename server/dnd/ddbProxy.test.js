// server/dnd/ddbProxy.test.js
// Run with: node dnd/ddbProxy.test.js
const assert = require('assert');
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
// server.js loads db.js on require; keep it off the real leaderboard DB (same as integration.test.js).
process.env.LEADERBOARD_DB = path.join(os.tmpdir(), `ddb-itest-${process.pid}.db`);
const express = require('express');
const { createDdbProxy, DDB_URL } = require('./ddbProxy');

let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log(`  ok - ${name}`); };

// fetch() normalises '%2e%2e' to '..' client-side, so the server would never see it; send the raw path instead.
function rawStatus(base, p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: Number(new URL(base).port), path: p }, (r) => { r.resume(); resolve(r.statusCode); }).on('error', reject);
  });
}

function serve(opts) {
  const app = express();
  app.use('/dnd', createDdbProxy(opts));
  return new Promise((resolve) => {
    const s = app.listen(0, () => resolve({ s, base: `http://127.0.0.1:${s.address().port}` }));
  });
}

function fakeFetch(status, body) {
  const calls = [];
  const fn = async (url, init) => { calls.push({ url, init }); return { status, text: async () => body }; };
  fn.calls = calls;
  return fn;
}

(async () => {
  await check('forwards an allowed id to D&D Beyond and relays the body', async () => {
    const f = fakeFetch(200, '{"data":{"id":1}}');
    const { s, base } = await serve({ fetchImpl: f });
    const r = await fetch(`${base}/dnd/ddb/165854050`);
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(await r.json(), { data: { id: 1 } });
    assert.strictEqual(f.calls[0].url, DDB_URL + '165854050');
    assert.strictEqual(r.headers.get('cache-control'), 'no-store');
    s.close();
  });

  await check('passes through 404 for private or missing sheets', async () => {
    const { s, base } = await serve({ fetchImpl: fakeFetch(404, '{"success":false}') });
    assert.strictEqual((await fetch(`${base}/dnd/ddb/1`)).status, 404);
    s.close();
  });

  await check('rejects anything but 1-12 digits and never calls out', async () => {
    const f = fakeFetch(200, '{}');
    const { s, base } = await serve({ fetchImpl: f });
    for (const id of ['abc', '12a', '1234567890123', 'evil.com', '%2e%2e', 'https%3A%2F%2Fevil.com']) {
      assert.strictEqual(await rawStatus(base, `/dnd/ddb/${id}`), 400, id);
    }
    assert.strictEqual(f.calls.length, 0);
    s.close();
  });

  await check('rate-limits each client per window', async () => {
    let t = 0;
    const { s, base } = await serve({ fetchImpl: fakeFetch(200, '{}'), limit: 2, windowMs: 1000, now: () => t });
    assert.strictEqual((await fetch(`${base}/dnd/ddb/1`)).status, 200);
    assert.strictEqual((await fetch(`${base}/dnd/ddb/1`)).status, 200);
    assert.strictEqual((await fetch(`${base}/dnd/ddb/1`)).status, 429);
    t = 1000;
    assert.strictEqual((await fetch(`${base}/dnd/ddb/1`)).status, 200);
    s.close();
  });

  await check('answers 502 when D&D Beyond is unreachable', async () => {
    const { s, base } = await serve({ fetchImpl: async () => { throw new Error('down'); } });
    assert.strictEqual((await fetch(`${base}/dnd/ddb/1`)).status, 502);
    s.close();
  });

  await check('server.js mounts the route', async () => {
    const { server } = require('../server');
    await new Promise((resolve) => server.listen(0, resolve));
    const r = await fetch(`http://127.0.0.1:${server.address().port}/dnd/ddb/not-digits`);
    assert.strictEqual(r.status, 400);
    server.close();
  });

  console.log(`ddbProxy: ${passed} passed`);
  for (const x of ['', '-wal', '-shm']) fs.rmSync(process.env.LEADERBOARD_DB + x, { force: true });
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
