import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { tick, indiaClock } from '../cloudflare/worker.mjs';

const now = Date.parse('2026-09-23T13:30:00Z');
const env = { ENABLED: 'true', DRY_RUN: 'false', GITHUB_TOKEN: 'test-only', GITHUB_REPOSITORY: 'owner/repo' };
function mock({ markers = [], state = 'active', pending = false, error = 0, dispatchCode = 204 } = {}) {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, ...options });
    if (error) return new Response('denied', { status: error });
    let body = {};
    if (options.method === 'POST') return new Response(dispatchCode === 204 ? null : '{}', { status: dispatchCode });
    if (url.endsWith('/repos/owner/repo')) body = { default_branch: 'main' };
    else if (url.includes('/contents/')) {
      const slot = Number(url.match(/example-(\d)/)[1]);
      const marker = markers[slot - 1];
      if (!marker) return new Response('', { status: 404 });
      body = { type: 'file', encoding: 'base64', content: btoa(`// AutoGitUpdater day: ${marker}\n`) };
    } else if (url.includes('/runs?')) {
      body = { total_count: pending ? 1 : 0, workflow_runs: pending ? [{ id: 100, status: 'queued' }] : [] };
    } else body = { state };
    return Response.json(body);
  };
  return { request, calls };
}
test('India window includes 19:00, excludes morning, switches day at midnight', async () => {
  assert.deepEqual(indiaClock(now), { day: '2026-09-23', hour: 19 });
  assert.deepEqual(indiaClock(Date.parse('2026-09-23T18:30Z')), { day: '2026-09-24', hour: 0 });
  const m = mock();
  assert.equal((await tick(env, now - 1, m.request)).status, 'outside-window');
  assert.equal((await tick({ ...env, ENABLED: 'false' }, now, m.request)).status, 'paused');
  assert.equal(m.calls.length, 0);
});
test('Stop is respected even when files are missing', async () => {
  const m = mock({ state: 'disabled_manually' });
  assert.equal((await tick(env, now, m.request)).status, 'workflow-stopped');
  assert.equal(m.calls.length, 2);
});
test('Completed day makes no dispatch; partial day dispatches once to default branch', async () => {
  const done = mock({ markers: Array(3).fill('2026-09-23') });
  assert.equal((await tick(env, now, done.request)).status, 'complete');
  assert.equal(done.calls.some(c => c.method === 'POST'), false);
  const partial = mock({ markers: ['2026-09-23', '2026-09-22'] });
  assert.equal((await tick(env, now, partial.request)).status, 'dispatched');
  const posts = partial.calls.filter(c => c.method === 'POST');
  assert.equal(posts.length, 1);
  assert.deepEqual(JSON.parse(posts[0].body), { ref: 'main' });
  assert.equal(posts[0].headers.Authorization, 'Bearer test-only');
});
test('Pending run prevents another dispatch; dry run never writes', async () => {
  const pending = mock({ pending: true });
  assert.equal((await tick(env, now, pending.request)).status, 'run-pending');
  assert.equal(pending.calls.some(c => c.method === 'POST'), false);
  const dry = mock();
  assert.equal((await tick({ ...env, DRY_RUN: 'true' }, now, dry.request)).status, 'would-dispatch');
  assert.equal(dry.calls.some(c => c.method === 'POST'), false);
});
test('Permission errors and future markers fail closed', async () => {
  for (const error of [401, 403, 429, 500]) {
    const m = mock({ error });
    await assert.rejects(tick(env, now, m.request), new RegExp(String(error)));
    assert.equal(m.calls.some(c => c.method === 'POST'), false);
  }
  const future = mock({ markers: ['2026-09-24'] });
  await assert.rejects(tick(env, now, future.request), /Future/);
  assert.equal(future.calls.some(c => c.method === 'POST'), false);
});
test('Dispatch rejection fails rather than claiming success; 200 and 204 accepted', async () => {
  const denied = mock({ dispatchCode: 403 });
  await assert.rejects(tick(env, now, denied.request), /403/);
  const accepted = mock({ dispatchCode: 200 });
  assert.equal((await tick(env, now, accepted.request)).status, 'dispatched');
});
test('No public HTTP endpoint can trigger a run', async () => {
  assert.equal((await worker.fetch(new Request('https://example.com/run', { method: 'POST' }))).status, 404);
});
