import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttp } from './http.js';
import { createRunsApi } from './runs.js';
import { createMockRunsApi } from './mockRuns.js';
import { checkPdfFiles } from './files.js';
import { demoFiles, makeDemoPdf } from './pdf.js';
import { validateRun } from './viewModel.js';
test('PDF selection excludes TXT, renamed non-PDFs, oversized files, and a fourth PDF',async()=>{
 const files=demoFiles();const result=await checkPdfFiles([new File(['text'],'a.txt'),new File(['fake'],'fake.pdf'),new File([new Uint8Array(10*1024*1024+1)],'large.pdf'),...files,files[0]]);
 assert.equal(result.files.length,3);assert.equal(result.errors.length,4);assert.ok(result.errors.some(e=>e.includes('only PDF')));
});
test('all API methods require a token and retrieve a current token per request',async()=>{
 let calls=0,token='first';const headers=[];
 const request=createHttp({getAccessToken:async()=>token,fetchImpl:async(_,init)=>{calls++;headers.push(init.headers.Authorization);return new Response('{}');}});
 await request('/runs');token='refreshed';await request('/runs');token=null;await assert.rejects(request('/runs'),/session has expired/);assert.equal(calls,2);assert.deepEqual(headers,['Bearer first','Bearer refreshed']);
});
test('the token cannot be sent to an arbitrary absolute source URL',async()=>{
 const request=createHttp({getAccessToken:async()=>'private',fetchImpl:()=>{throw new Error('must not fetch');}});
 await assert.rejects(request('https://example.com/source'),/relative/);await assert.rejects(request('//example.com/source'),/relative/);
});
test('pending contract blocks speculative API calls',async()=>{let called=false;const api=createRunsApi({getAccessToken:async()=>'token',fetchImpl:()=>{called=true;}});await assert.rejects(api.createRun(demoFiles()),/waiting for the backend contract/);await assert.rejects(api.listRuns(),/waiting/);assert.equal(called,false);});
test('confirmed create maps POST /runs multipart and validates normalized response',async()=>{
 const view={id:'run1',status:'waiting-from-backend',terminal:false,documents:[],documentErrors:[],result:null};
 const api=createRunsApi({getAccessToken:async()=>'current-token',contract:{confirmed:true,createPath:'/runs',uploadField:'files',decodeRun:raw=>{assert.equal(raw.backend_id,'run1');return view;}},fetchImpl:async(url,init)=>{assert.ok(url.endsWith('/runs'));assert.equal(init.method,'POST');assert.equal(init.headers.Authorization,'Bearer current-token');assert.equal(init.headers['Content-Type'],undefined);assert.equal(init.body.getAll('files').length,3);return new Response('{"backend_id":"run1"}');}});
 assert.deepEqual(await api.createRun(demoFiles()),view);
});
test('HTTP 401 and 403 are actionable without substituting mock data',async()=>{
 for(const status of [401,403]){const request=createHttp({getAccessToken:async()=>'token',fetchImpl:async()=>new Response('{"detail":"no"}',{status})});await assert.rejects(request('/runs'),e=>e.status===status);}
});
test('authenticated PDF retrieval verifies bytes and leaves the token out of the URL',async()=>{
 const request=createHttp({getAccessToken:async()=>'secret-token',fetchImpl:async(url,init)=>{assert.equal(url.includes('secret-token'),false);assert.equal(init.headers.Authorization,'Bearer secret-token');return new Response(makeDemoPdf(['Fictional source']));}});
 assert.equal((await request('/source',{pdf:true})).type,'application/pdf');
 const bad=createHttp({getAccessToken:async()=>'x',fetchImpl:async()=>new Response('<html>login</html>')});await assert.rejects(bad('/source',{pdf:true}),/did not return a PDF/);
});
test('demo run lifecycle, history, source retrieval and saved review survive reopen',async()=>{
 let time=0;const api=createMockRunsApi({now:()=>time,id:()=>'mock1'});const run=await api.createRun(demoFiles(),'flawed');assert.equal(run.status,'queued');time=400;assert.equal((await api.getRun(run.id)).status,'processing');time=3600;const complete=await api.getRun(run.id);validateRun(complete);assert.equal(complete.terminal,true);assert.equal(complete.result.findings.length,3);
 await api.saveReview(run.id,'ISSUE-001',{status:'needs_clarification',note:'Verify cohort'});assert.equal((await api.getRun(run.id)).reviews['ISSUE-001'].note,'Verify cohort');assert.equal((await api.listRuns()).length,1);assert.equal((await api.getSource(run.id,complete.documents[0].id)).type,'application/pdf');
 const fresh=createMockRunsApi();assert.equal((await fresh.listRuns()).length,0);
});
test('failed processing reports document errors and never returns completed findings',async()=>{let time=0;const api=createMockRunsApi({now:()=>time,id:()=>'failed'});await api.createRun(demoFiles(),'failure');time=3600;const run=await api.getRun('failed');assert.equal(run.status,'failed');assert.equal(run.result,null);assert.equal(run.documentErrors.length,1);});
test('view mapping rejects partial reports and invalid documents',()=>{assert.throws(()=>validateRun({id:'x',status:'anything',terminal:true,documents:[{}],documentErrors:[]}));assert.throws(()=>validateRun({id:'x',status:'anything',terminal:false,documents:[],documentErrors:[],result:{status:'completed',documents_analyzed:0,findings:[]}}));});
test('source contract gets a fresh signed grant for every open without leaking the bearer token',async()=>{
 const calls=[];let grants=0;
 const api=createRunsApi({getAccessToken:async()=>'user-token',fetchImpl:async(url,init)=>{
  calls.push({url,init});
  if(url.includes('/documents/')){grants++;assert.equal(init.headers.Authorization,'Bearer user-token');assert.equal(init.cache,'no-store');return new Response(JSON.stringify({document_id:'doc-1',filename:'source.pdf',url:`https://storage.example/signed.pdf?token=grant-${grants}`,expires_in:60}));}
  assert.equal(init.headers,undefined);assert.equal(init.credentials,'omit');assert.equal(init.referrerPolicy,'no-referrer');assert.equal(init.cache,'no-store');return new Response(makeDemoPdf(['Synthetic source']));
 }});
 assert.equal((await api.getSource('run1','doc-1')).type,'application/pdf');await api.getSource('run1','doc-1');assert.equal(grants,2);assert.notEqual(calls[1].url,calls[3].url);
});
test('expired signed links are refreshed once without retrying indefinitely',async()=>{
 let grants=0,downloads=0;
 const api=createRunsApi({getAccessToken:async()=>'token',fetchImpl:async(url)=>{
  if(url.includes('/documents/')){grants++;return new Response(JSON.stringify({document_id:'d',filename:'source.pdf',url:'https://storage.example/source.pdf',expires_in:60}));}
  downloads++;return downloads===1?new Response('',{status:403}):new Response(makeDemoPdf(['source']));
 }});
 await api.getSource('run','d');assert.equal(grants,2);assert.equal(downloads,2);
});
test('source grants reject wrong document IDs and insecure URLs',async()=>{
 for(const grant of [{document_id:'other',filename:'x.pdf',url:'https://storage.example/pdf',expires_in:60},{document_id:'d',filename:'x.pdf',url:'http://storage.example/pdf',expires_in:60}]){
  let requests=0;const api=createRunsApi({getAccessToken:async()=>'token',fetchImpl:async()=>{requests++;return new Response(JSON.stringify(grant));}});await assert.rejects(api.getSource('r','d'));assert.equal(requests,1);
 }
});
