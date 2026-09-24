const API = 'https://api.github.com';
const WORKFLOW = 'daily-update.yml';

export function indiaClock(time) {
  const date = new Date(time + 330 * 60_000);
  return { day: date.toISOString().slice(0, 10), hour: date.getUTCHours() };
}

export async function tick(env, time = Date.now(), request = fetch) {
  if (env.ENABLED !== 'true') return { status: 'paused' };
  const { day, hour } = indiaClock(time);
  if (hour < 19) return { status: 'outside-window', day };
  if (!env.GITHUB_TOKEN) throw new Error('Missing GITHUB_TOKEN secret');
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || '')) {
    throw new Error('Invalid GITHUB_REPOSITORY');
  }
  const base = `/repos/${env.GITHUB_REPOSITORY}`;
  async function api(path, method = 'GET', body, allow404 = false) {
    const response = await request(`${API}${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'AutoGitUpdater-Cloudflare-Timer',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20_000),
      // Workers supports manual/follow only. Reject 3xx below without forwarding credentials.
      redirect: 'manual',
    });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) {
      const error = new Error(`GitHub ${method} failed (${response.status})`);
      error.diagnostic = { stage: path.split('?')[0] || '/repository', method, status: response.status };
      throw error;
    }
    if (response.status === 204) return null;
    return response.json();
  }
  const repository = await api('');
  if (repository.archived || repository.disabled) return { status: 'repository-disabled', day };
  const workflow = await api(`/actions/workflows/${WORKFLOW}`);
  if (workflow.state !== 'active') return { status: 'workflow-stopped', day };
  const branch = repository.default_branch;
  if (!branch) throw new Error('Repository has no default branch');
  const markers = await Promise.all([1, 2, 3].map(async slot => {
    const file = await api(`/contents/Project_github1/example-${slot}.js?ref=${encodeURIComponent(branch)}`, 'GET', undefined, true);
    if (!file) return null;
    if (file.encoding !== 'base64' || file.type !== 'file') throw new Error('Unexpected example file format');
    const marker = atob(file.content.replace(/\s/g, '')).match(/^\/\/ AutoGitUpdater day: (\d{4}-\d{2}-\d{2})$/m)?.[1];
    if (!marker) throw new Error('Unrecognized example file; manual review needed');
    if (marker > day) throw new Error('Future day marker; manual review needed');
    return marker;
  }));
  const completed = markers.filter(marker => marker === day).length;
  if (completed === 3) return { status: 'complete', day, completed };
  // Query unfinished runs separately so old waiting runs cannot fall off the first page.
  for (const status of ['queued', 'in_progress', 'waiting', 'pending', 'requested']) {
    const runs = await api(`/actions/workflows/${WORKFLOW}/runs?branch=${encodeURIComponent(branch)}&status=${status}&per_page=1`);
    if (runs.total_count > 0) return { status: 'run-pending', day, completed, run: runs.workflow_runs[0]?.id };
  }
  const history = await api(`/actions/workflows/${WORKFLOW}/runs?branch=${encodeURIComponent(branch)}&per_page=1`);
  const lastConclusion = history.workflow_runs[0]?.conclusion ?? null;
  if (env.DRY_RUN !== 'false') return { status: 'would-dispatch', day, completed, lastConclusion };
  await api(`/actions/workflows/${WORKFLOW}/dispatches`, 'POST', { ref: branch });
  return { status: 'dispatched', day, completed, lastConclusion };
}

export default {
  async scheduled(controller, env) {
    try {
      const result = await tick(env);
      console.log(JSON.stringify(result));
      return result;
    } catch (error) {
      // Never log request headers, secret values, or GitHub response bodies.
      const detail = String(error.message).split(env.GITHUB_TOKEN || '\0').join('[redacted]')
        .replace(/(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]+/g, '[redacted]').slice(0, 240);
      console.error(JSON.stringify(error.diagnostic || { stage: 'runtime', type: error.name, detail }));
      throw new Error('AutoGitUpdater timer failed');
    }
  },
  fetch() {
    return new Response('Not found', { status: 404 });
  },
};
