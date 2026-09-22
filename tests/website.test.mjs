import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../website/dist/app.js',import.meta.url),'utf8');
function harness(handler) {
  const elements=new Map(),calls=[],registered=[];
  const element=()=>({value:'',textContent:'',hidden:false,disabled:false,addEventListener(){},replaceChildren(){},append(){}});
  const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll(){return[];},createElement:element,modelContext:{registerTool(t){registered.push(t);}}};
  const context=vm.createContext({document,AbortController,AbortSignal,URL,Date,console,atob,addEventListener(){},fetch:async(url,options={})=>{calls.push({url,options});const r=await handler(url,options);return {ok:r.status<400,status:r.status,json:async()=>r.body,text:async()=>r.body===undefined?'':JSON.stringify(r.body)};}});
  vm.runInContext(source,context);
  return {context,calls,elements,registered,run:code=>vm.runInContext(code,context)};
}

test('credential only goes directly to GitHub; empty 202 cancellation succeeds',async()=>{
  const h=harness(()=>({status:202}));
  h.run("token='test-only-token'");
  assert.equal(await h.run("api('/repos/a/b/actions/runs/1/cancel','POST')"),null);
  assert.equal(h.calls[0].url,'https://api.github.com/repos/a/b/actions/runs/1/cancel');
  assert.equal(h.calls[0].options.headers.Authorization,'Bearer test-only-token');
  assert.equal(h.calls[0].options.credentials,'omit');
  assert.equal(h.calls[0].options.redirect,'error');
  assert.ok(!/localStorage|sessionStorage|document\.cookie/.test(source));
});

test('setup refuses existing unmanaged generator before any mutation',async()=>{
  const templates={ 'scripts/generate-update.mjs':'generator' };
  const h=harness(url=>({status:200,body:url==='template.json'?templates:url.includes('/actions/workflows/')?{}:url.includes('/git/ref/')?{object:{sha:'head'}}:url.includes('/git/commits/')?{tree:{sha:'tree'}}:url.includes('/git/trees/')?{tree:[{type:'blob',path:'scripts/generate-update.mjs'}]}:{full_name:'a/b',default_branch:'main',permissions:{push:true}}}));
  // Missing workflow is expected during initial setup.
  const originalFetch=h.context.fetch;
  h.context.fetch=async(url,opts)=>url.includes('/actions/workflows/')?{ok:false,status:404}:originalFetch(url,opts);
  h.run("token='test';user={login:'a',id:1};$('repository').value='a/b'");
  await assert.rejects(h.run('install()'),/would replace/);
  assert.ok(h.calls.every(c=>!c.options.method||c.options.method==='GET'));
});

test('stop disables future runs and cancels all statuses without token exposure',async()=>{
  const h=harness((url,opts)=>{
    if(url.endsWith('/disable'))return {status:204};
    if(url.endsWith('/cancel'))return {status:202};
    if(url.includes('?status=queued'))return {status:200,body:{workflow_runs:[{id:9}]}};
    if(url.includes('/runs?'))return {status:200,body:{workflow_runs:[]}};
    return {status:200,body:{state:'disabled_manually'}};
  });
  h.run("token='test';user={login:'a'};repo={full_name:'a/b'};workflow={state:'active'}");
  await h.run('stop()');
  assert.ok(h.calls[0].url.endsWith('/disable'));
  assert.equal(h.calls.filter(c=>c.url.endsWith('/cancel')).length,1);
  assert.match(h.elements.get('message').textContent,/Future runs stopped/);
  assert.equal(h.run('workflow.state'),'disabled_manually');
  const tool=h.registered[0];
  assert.equal(tool.name,'get_automation_status');
  assert.throws(()=>tool.execute({token:'bad'}),/empty object/);
  assert.ok(!Object.hasOwn(tool.execute({}),'token'));
});

test('bad credentials fail without reflecting a secret or remote message',async()=>{
  const h=harness(()=>({status:401,body:{message:'secret-token'}}));
  h.run("token='secret-token'");
  await assert.rejects(h.run("api('/user')"),e=>e.status===401&&!e.message.includes('secret-token'));
});
