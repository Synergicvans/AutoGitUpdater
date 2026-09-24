// One-off integration test. NOT the deployed entry point. Requests one GitHub run.
// Existing generator day markers prevent duplicate daily commits.
export default {
  async scheduled(_event, env) {
    const base = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}`;
    const headers = { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'AutoGitUpdater-verification', 'X-GitHub-Api-Version': '2022-11-28' };
    const workflow = await fetch(`${base}/actions/workflows/daily-update.yml`, { headers, redirect: 'manual' });
    if (!workflow.ok || (await workflow.json()).state !== 'active') throw new Error('Workflow unavailable or stopped');
    const repo = await fetch(base, { headers, redirect: 'manual' });
    if (!repo.ok) throw new Error(`Repository check failed (${repo.status})`);
    const { default_branch: ref } = await repo.json();
    const response = await fetch(`${base}/actions/workflows/daily-update.yml/dispatches`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref }), redirect: 'manual',
    });
    const errorBody = response.ok ? null : await response.json().catch(() => null);
    console.log(JSON.stringify({ verification: 'dispatch', status: response.status,
      requiredPermissions: response.headers.get('x-accepted-github-permissions'),
      rateRemaining: response.headers.get('x-ratelimit-remaining'),
      tokenAccessDenied: errorBody?.message === 'Resource not accessible by personal access token',
    }));
    if (!response.ok) throw new Error(`Dispatch failed (${response.status})`);
  },
  fetch() { return new Response('Not found', { status: 404 }); },
};
