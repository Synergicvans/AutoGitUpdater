const $ = (id) => document.getElementById(id);
let token = '', user = null, repo = null, workflow = null, busy = false;
const WORKFLOW = 'daily-update.yml';
const MARKER = '.autogitupdater.json';

function notice(text, error = false) {
  $('message').textContent = text;
  $('message').className = error ? 'error' : '';
  $('message').hidden = false;
}
function controls() {
  document.querySelectorAll('button').forEach(b => b.disabled = busy);
  $('repo-controls').disabled = busy || !user;
  $('token').disabled = busy;
  $('connect-form').hidden = !!user;
  $('account').hidden = !user;
  $('connection').textContent = user ? 'Connected' : 'Not connected';
  $('connection').className = `badge${user ? ' active' : ''}`;
  $('login').textContent = user?.login || '';
  $('run').disabled = busy || !workflow || workflow.state !== 'active';
  $('stop').disabled = busy || !workflow || workflow.state !== 'active';
  $('resume').disabled = busy || !workflow || workflow.state === 'active';
  $('refresh').disabled = busy || !repo;
}
async function perform(fn) {
  if (busy) return;
  busy = true; controls();
  try { return await fn(); }
  catch (e) { notice(e.message || 'Request failed. Please try again.', true); }
  finally { busy = false; controls(); }
}
async function api(path, method = 'GET', body) {
  if (!token) throw new Error('Connect your GitHub account first.');
  const r = await fetch(`https://api.github.com${path}`, {
    method, credentials: 'omit', cache: 'no-store', redirect: 'error',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(body ? {'Content-Type':'application/json'} : {}) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25000)
  });
  if (!r.ok) {
    const e = new Error(r.status === 401 ? 'GitHub rejected the token. Disconnect and connect with a valid token.' : r.status === 403 ? 'GitHub denied access. Check token permissions, organization policies, Actions settings, or rate limits.' : r.status === 404 ? 'GitHub could not find this resource, or your token cannot access it.' : r.status === 422 ? 'GitHub rejected the change. The repository may already exist, a branch may have changed, or workflow permissions may be missing.' : `GitHub request failed (${r.status}). Refresh and check the repository before retrying.`);
    e.status = r.status; throw e;
  }
  const responseText = await r.text();
  return responseText ? JSON.parse(responseText) : null;
}
function selectedPath() {
  const value = $('repository').value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(value)) throw new Error('Enter a repository as owner/name.');
  return `/repos/${value}`;
}
function base() { if (!repo) throw new Error('Load a repository first.'); return `/repos/${repo.full_name}`; }
function resetRepo() {
  repo = null; workflow = null;
  $('workflow-state').textContent = 'Not loaded';
  $('workflow-state').className = 'badge';
  $('github-actions').hidden = true;
  $('runs').replaceChildren(Object.assign(document.createElement('li'), { className: 'empty', textContent: 'No repository loaded.' }));
  controls();
}
function showRuns(runs) {
  $('runs').replaceChildren();
  if (!runs.length) $('runs').append(Object.assign(document.createElement('li'), { className:'empty', textContent:'No runs yet. Use Run today to verify the setup.' }));
  for (const run of runs) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = `https://github.com/${repo.full_name}/actions/runs/${Number(run.id)}`;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = `${run.conclusion || run.status} · ${run.event === 'schedule' ? 'Scheduled' : 'Manual'}`;
    if (run.conclusion === 'success') link.className = 'success';
    const date = document.createElement('small'); date.textContent = new Date(run.created_at).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    li.append(link, date); $('runs').append(li);
  }
}
async function refresh() {
  const b = base();
  workflow = null;
  try { workflow = await api(`${b}/actions/workflows/${WORKFLOW}`); }
  catch(e) { if (e.status !== 404) throw e; }
  $('workflow-state').textContent = workflow ? (workflow.state === 'active' ? 'Enabled' : 'Stopped') : 'Not installed / unavailable';
  $('workflow-state').className = `badge${workflow?.state === 'active' ? ' active' : ''}`;
  $('github-actions').href = `https://github.com/${repo.full_name}/actions`;
  $('github-actions').hidden = false;
  $('run-note').textContent = workflow ? 'Run today skips files already updated today. Refresh to see new runs. Times below use your browser timezone.' : 'Set up daily updates, or check Actions permissions. Newly installed workflows may take a moment to appear.';
  const runs = workflow ? await api(`${b}/actions/workflows/${WORKFLOW}/runs?per_page=5`) : {workflow_runs:[]};
  showRuns(runs.workflow_runs); controls();
}
async function loadRepo() {
  resetRepo();
  repo = await api(selectedPath());
  if (!repo.permissions?.push) { repo = null; throw new Error('Your token needs write access to this repository.'); }
  if (repo.archived || repo.disabled) {repo = null; throw new Error('Choose an active, writable repository.');}
  await refresh();
}
async function connect(event) {
  event.preventDefault();
  await perform(async () => {
    token = $('token').value.trim(); $('token').value = '';
    if (!token) throw new Error('Enter a GitHub token.');
    try { user = await api('/user'); }
    catch (e) { token = ''; throw e; }
    $('repository').value = `${user.login}/AutoGitUpdater`;
    notice(`Connected as ${user.login}. Load your repository, or create a dedicated one.`);
  });
}
async function install() {
  await loadRepo();
  const b = base();
  const response = await fetch('template.json', {cache:'no-store'});
  if (!response.ok) throw new Error('Could not load the installation template.');
  const templates = await response.json();
  const branch = encodeURIComponent(repo.default_branch);
  let ref;
  try { ref = await api(`${b}/git/ref/heads/${branch}`); }
  catch (e) { if (e.status === 404 || e.status === 409) throw new Error('Initialize this repository with a README on GitHub, then try setup again.'); throw e; }
  const commit = await api(`${b}/git/commits/${ref.object.sha}`);
  const tree = await api(`${b}/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated) throw new Error('Repository is too large for safe setup. Choose a dedicated repository.');
  const managed = tree.tree.find(f => f.path === MARKER);
  if (managed) {
    const markerFile = await api(`${b}/contents/${MARKER}?ref=${branch}`);
    let config; try {config = JSON.parse(atob(markerFile.content.replace(/\s/g,'')));} catch {throw new Error('Unrecognized setup marker. Use a new repository.');}
    if (config.app !== 'AutoGitUpdater' || config.version !== 1) throw new Error('Unrecognized setup marker. Use a new repository.');
  } else {
    const conflicts = tree.tree.filter(f => f.type === 'blob' && (Object.hasOwn(templates,f.path) || f.path.startsWith('Project_github1/')));
    if (conflicts.length) throw new Error('This repository contains files setup would replace. Use a new repository, or manage the existing workflow with Load.');
  }
  const author = `${user.id}+${user.login}@users.noreply.github.com`;
  templates['.github/actions/update-example/action.yml'] = templates['.github/actions/update-example/action.yml'].replaceAll('91491055+Synergicvans@users.noreply.github.com',author).replaceAll('Synergicvans',user.login);
  templates[MARKER] = JSON.stringify({app:'AutoGitUpdater',version:1,author:user.login},null,2)+'\n';
  if (!tree.tree.some(f => f.path === 'Project_github1/README.md')) templates['Project_github1/README.md'] = '# Generated examples\nThree small automated examples, refreshed daily at 7 PM India time.\n';
  const next = await api(`${b}/git/trees`,'POST',{base_tree:commit.tree.sha,tree:Object.entries(templates).map(([path,content])=>({path,mode:'100644',type:'blob',content}))});
  const created = await api(`${b}/git/commits`,'POST',{message:'Set up AutoGitUpdater daily automation',tree:next.sha,parents:[ref.object.sha]});
  await api(`${b}/git/refs/heads/${branch}`,'PATCH',{sha:created.sha,force:false});
  notice('Setup saved. Daily updates are scheduled for 7 PM India time. Refresh if the workflow is still registering.');
  await refresh();
}
async function stop() {
  const b = base();
  await api(`${b}/actions/workflows/${WORKFLOW}/disable`,'PUT');
  // Snapshot pending run IDs before cancellation so pagination cannot skip shrinking pages.
  const ids = new Set();
  try {
    for (const status of ['queued','in_progress','waiting','requested','pending']) {
      for (let page=1;page<=10;page++) {
        const data=await api(`${b}/actions/workflows/${WORKFLOW}/runs?status=${status}&per_page=100&page=${page}`);
        data.workflow_runs.forEach(r=>ids.add(r.id));
        if(data.workflow_runs.length<100) break;
        if(page===10) throw new Error('Too many active runs to cancel automatically.');
      }
    }
    const failed=[];
    for (const id of ids) {try {await api(`${b}/actions/runs/${id}/cancel`,'POST');}catch(e){if(e.status!==409)failed.push(id);}}
    if(failed.length) throw new Error('Some active runs could not be cancelled.');
    notice('Future runs stopped. Cancellation requested for pending runs; already pushed commits remain. Check GitHub for final cancellation status.');
  } catch {notice('Future runs stopped, but cancellation could not be fully confirmed. Open GitHub Actions to cancel any remaining runs.',true);}
  await refresh();
}
$('connect-form').addEventListener('submit', connect);
$('disconnect').addEventListener('click',()=>{token='';user=null;resetRepo();notice('Disconnected. Your cloud schedule continues until you stop it.');});
$('repository').addEventListener('input',()=>{if(!busy) resetRepo();});
$('load').addEventListener('click',()=>perform(loadRepo));
$('install').addEventListener('click',()=>perform(install));
$('create').addEventListener('click',()=>perform(async()=>{
  const created = await api('/user/repos','POST',{name:'AutoGitUpdater',private:$('private').checked,auto_init:true,description:'Transparent daily GitHub automation'});
  $('repository').value=created.full_name;await loadRepo();notice('Repository created. Click Set up daily updates to install the automation.');
}));
$('refresh').addEventListener('click',()=>perform(refresh));
$('run').addEventListener('click',()=>perform(async()=>{await api(`${base()}/actions/workflows/${WORKFLOW}/dispatches`,'POST',{ref:repo.default_branch});notice('Run requested. GitHub may take a moment to list it; use Refresh to check progress.');await refresh();}));
$('stop').addEventListener('click',()=>perform(stop));
$('resume').addEventListener('click',()=>perform(async()=>{await api(`${base()}/actions/workflows/${WORKFLOW}/enable`,'PUT');notice('Future daily runs enabled. Missed days will not be backfilled.');await refresh();}));
controls();

// Exposes only non-secret read-only state, never the in-memory credential.
if (document.modelContext?.registerTool) {
  const lifetime = new AbortController();
  document.modelContext.registerTool({name:'get_automation_status',description:'Read the currently loaded AutoGitUpdater repository and schedule. Does not refresh GitHub or modify any data.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).length) throw new Error('Expected an empty object.');return {connected:!!user,repository:repo?.full_name??null,workflowState:workflow?.state??null,schedule:'19:00 Asia/Kolkata',commitsPerDay:3};}},{signal:lifetime.signal});
  addEventListener('pagehide',()=>lifetime.abort(),{once:true});
}
