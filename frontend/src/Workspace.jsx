import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './auth/AuthProvider.jsx';
import { Link, navigate } from './router.jsx';
import { Icon, FindingCard, Comparison } from './components.jsx';
import { Pipeline, EvidenceDialog, text } from './ReviewWorkspace.jsx';
import { brandAssets } from './brand.js';
import { MOCK_MODE, groups, counts, severityGroup, serializeReport } from './api.js';
import { createMockRunsApi } from './services/mockRuns.js';
import { createRunsApi } from './services/runs.js';
import { backendContract } from './services/backendContract.js';
import { demoFiles } from './services/pdf.js';
import { checkPdfFiles } from './services/files.js';
const formatDate = value => value ? (Number.isNaN(Date.parse(value)) ? text(value) : new Date(value).toLocaleString()) : 'Not reported';
function ErrorMessage({ error }) {
  const auth=useAuth(),[failure,setFailure]=useState('');
  async function reauthenticate(){try{await auth.signOut();navigate('/login');}catch(e){setFailure(e.message);}}
  if (!error) return null;
  return <div className="error" role="alert">{error.message || text(error)}{error.status===401 && <> <button className="text-button" onClick={reauthenticate}>Sign in again</button>{failure&&<p>{failure}</p>}</>}</div>;
}
export default function Workspace({ path, publicDemo = false }) {
  const auth = useAuth(), mock = publicDemo || MOCK_MODE;
  const api = useMemo(() => mock ? createMockRunsApi() : createRunsApi({ getAccessToken: auth.getAccessToken }), [mock, auth.getAccessToken]);
  const base = publicDemo ? '/demo' : '/app';
  const [successful, setSuccessful] = useState([]);
  const remember = run => setSuccessful(old => old.some(r=>r.id===run.id) ? old.map(r=>r.id===run.id?run:r) : [...old,run]);
  const runId = path.startsWith(`${base}/runs/`) ? decodeURIComponent(path.slice(`${base}/runs/`.length)) : null;
  const history = path === `${base}/history`;
  const knownRoute = history || runId || path === base;
  return <><nav className="workspace-nav" aria-label="Workspace"><Link to={base} aria-current={path===base?'page':undefined}>New analysis</Link><Link to={`${base}/history`} aria-current={history?'page':undefined}>Analysis history</Link><span>{mock?'Demo adapter':'FastAPI workspace'}</span></nav>{mock && <div className="workspace-notice"><strong>DEMO WORKSPACE</strong><p>Processing states and findings are illustrative. Uploaded content is not analyzed. Demo history and saved reviews last only until refresh.</p></div>}{!mock && !backendContract.confirmed && <div className="context-note"><strong>Backend contract pending.</strong> Supabase account access is separate from run integration. Upload and saved-run requests will become available when your teammate’s schemas are mapped.</div>}{runId?<RunPage key={runId} api={api} runId={runId} base={base} successful={successful} onCompleted={remember}/>:history?<HistoryPage api={api} base={base}/>:knownRoute?<UploadPage api={api} base={base}/>:<section className="auth-card"><h2>Page not found</h2><Link to={base}>Return to workspace</Link></section>}</>;
}
function UploadPage({ api, base }) {
  const [files,setFiles] = useState([]),[errors,setErrors] = useState([]),[busy,setBusy] = useState(false),[checking,setChecking] = useState(false),[drag,setDrag] = useState(false),[scenario,setScenario] = useState('flawed');
  const picker=useRef(null),lock=useRef(false),mounted=useRef(true),controller=useRef(null);
  useEffect(()=>()=>{mounted.current=false;controller.current?.abort();},[]);
  async function add(incoming) {
    if(lock.current)return;lock.current=true;setChecking(true);
    try { const checked=await checkPdfFiles(incoming,files);if(mounted.current){setFiles(checked.files);setErrors(checked.errors);} }
    catch { if(mounted.current)setErrors(['Could not read one of the selected files. Please choose it again.']); }
    finally {lock.current=false;if(mounted.current)setChecking(false);}
  }
  async function submit() {
    if(lock.current||files.length<2||files.length>3)return;
    lock.current=true;setBusy(true);setErrors([]);controller.current=new AbortController();
    try {const run=await api.createRun(files,scenario,{signal:controller.current.signal});if(mounted.current)navigate(`${base}/runs/${encodeURIComponent(run.id)}`);}
    catch(error){if(mounted.current&&error.name!=='AbortError')setErrors([error.message]);}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  }
  const disabled=busy||checking;
  return <><section className="intro"><div className="eyebrow"><span className="tiny-line"/> EVIDENCE INTEGRITY REVIEW</div><h1>Clarity in every claim.</h1><p>Assemble your evidence package, follow its analysis,<br className="desktop-break"/> and trace every finding back to its source.</p></section>{brandAssets.pipeline&&<figure className="pipeline-asset"><img src={brandAssets.pipeline} alt={brandAssets.pipelineAlt}/></figure>}<section className="upload-panel"><div className="section-heading"><div><span className="eyebrow">YOUR EVIDENCE PACKAGE</span><h2>Add PDF documents for review</h2></div><span className="count-chip">{files.length} / 3 documents</span></div><p className="section-description">Scientific summary, model validation report, and results table. PDF only.</p>{api.mode==='mock'&&<div className="demo-bar"><span className="demo-pill">DEMO SCENARIO</span><label>Sample<select value={scenario} disabled={disabled} onChange={e=>setScenario(e.target.value)}><option value="flawed">Flawed package</option><option value="corrected">Corrected package</option><option value="failure">Document processing error</option></select></label></div>}<div className={`dropzone ${drag?'dragging':''}`} onDragOver={e=>{e.preventDefault();if(!disabled)setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);add([...e.dataTransfer.files]);}}><div className="upload-icon"><Icon name="upload" size={24}/></div><h3>Drop your PDFs here</h3><p>or <button className="text-button" disabled={disabled} onClick={()=>picker.current.click()}>browse files</button> to build your package</p><span className="fineprint">PDF only · Up to 10 MB each · 2–3 documents</span><input ref={picker} type="file" className="sr-only" aria-label="Choose PDF documents" accept=".pdf,application/pdf" multiple disabled={disabled} onChange={e=>{add([...e.target.files]);e.target.value='';}}/></div>{api.mode==='mock'&&<div className="demo-shortcut"><span>Use the fictional example documents</span><button className="text-button" disabled={disabled} onClick={()=>{setFiles(demoFiles());setErrors([]);}}>Load sample PDFs ↗</button></div>}{files.length>0&&<ul className="file-list">{files.map((file,index)=><li key={`${file.name}-${index}`}><span className="file-icon"><Icon name="file"/></span><div><strong>{file.name}</strong><span>{Math.max(1,Math.round(file.size/1024))} KB · PDF</span></div><button className="icon-button" disabled={disabled} aria-label={`Remove ${file.name}`} onClick={()=>setFiles(old=>old.filter((_,i)=>i!==index))}><Icon name="cross" size={17}/></button></li>)}</ul>}{errors.length>0&&<div role="alert" className="error">{errors.map((error,i)=><p key={i}>{error}</p>)}</div>}<div className="upload-bottom"><p role="status">{checking?'Checking PDF files…':busy?'Submitting evidence package…':files.length<2?'Select at least 2 PDF documents to begin.':'Your package is ready for review.'}</p><button className="primary" disabled={disabled||files.length<2} onClick={submit}>{busy?'Submitting…':'Start analysis'}<Icon name="arrow" size={18}/></button></div></section><Pipeline busy={busy}/></>;
}
function useRun(api,id) {
  const [run,setRun]=useState(null),[error,setError]=useState(null),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true,timer;const controller=new AbortController();setError(null);
    async function load(){try{const next=await api.getRun(id,{signal:controller.signal});if(!active)return;setRun(next);setError(null);if(!next.terminal)timer=setTimeout(load,1500);}catch(failure){if(active&&failure.name!=='AbortError')setError(failure);}}
    load();return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[api,id,attempt]);
  return {run,setRun,error,retry:()=>setAttempt(old=>old+1)};
}
function RunPage({api,runId,base,successful,onCompleted}) {
  const {run,setRun,error,retry}=useRun(api,runId),[selection,setSelection]=useState(null),[drafts,setDrafts]=useState({}),[reviewStates,setReviewStates]=useState({});
  const heading=useRef(null),active=useRef(true),controllers=useRef(new Set());
  useEffect(()=>{heading.current?.focus();return()=>{active.current=false;controllers.current.forEach(c=>c.abort());};},[]);
  useEffect(()=>{if(run?.result?.status==='completed'){onCompleted(run);heading.current?.focus();}},[run?.id,run?.result]);
  async function save(finding,index) {
    if(!finding.id)return;
    const key=String(index),controller=new AbortController();controllers.current.add(controller);
    setReviewStates(old=>({...old,[key]:{busy:true,message:''}}));
    try {const saved=await api.saveReview(runId,finding.id,drafts[key]||run.reviews?.[finding.id]||{status:'unreviewed',note:''},{signal:controller.signal});if(!active.current)return;setRun(old=>({...old,reviews:{...old.reviews,[finding.id]:saved}}));setReviewStates(old=>({...old,[key]:{busy:false,message:api.mode==='mock'?'Saved in demo session':'Review saved'}}));}
    catch(failure){if(active.current)setReviewStates(old=>({...old,[key]:{busy:false,message:`Not saved: ${failure.message}`}}));}
    finally{controllers.current.delete(controller);}
  }
  function inspect(source) {const matches=run.documents.filter(d=>source.document_id?d.id===source.document_id:d.filename===source.filename);setSelection({source,document:matches.length===1?matches[0]:null});}
  function download(){const url=URL.createObjectURL(new Blob([serializeReport(run.result)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='regulens-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const result=run?.result;
  const previous=successful.filter(r=>r.id!==runId && Date.parse(r.createdAt)<Date.parse(run?.createdAt)).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)).at(-1);
  return <section className="results"><div className="section-heading results-heading"><div><span className="eyebrow">{api.mode==='mock'?'DEMO DATA · ':''}ANALYSIS RUN</span><h1 className="workspace-title" ref={heading} tabIndex={-1}>{result?'Your evidence, in focus.':'Analysis progress'}</h1></div><Link className="secondary" to={base}>New analysis</Link></div><ErrorMessage error={error}/>{error&&<button className="secondary" onClick={retry}>Retry status request</button>}{!run&&!error&&<p role="status">Loading analysis run…</p>}{run&&<><div className="run-status" role="status"><span className={`status-pill ${run.terminal?'terminal':'processing'}`}>{text(run.status)}</span><span>{run.terminal?'Final reported status':'Status refreshes automatically'}</span>{!run.terminal&&!error&&<span className="spinner dark-spinner"/>}</div><div className="run-details"><span><strong>Run ID</strong>{run.id}</span><span><strong>Created</strong>{formatDate(run.createdAt)}</span><span><strong>Last updated</strong>{formatDate(run.updatedAt)}</span>{run.completedAt&&<span><strong>Completed</strong>{formatDate(run.completedAt)}</span>}<span><strong>Analysis method</strong>{run.method==null?'Not reported':text(run.method)}</span><span><strong>Fallback used</strong>{run.fallback==null?'Not reported':text(run.fallback)}</span></div><section className="document-status"><h2>Documents in this run</h2>{run.documents.map(d=><div className="document-status-row" key={d.id}><Icon name="file"/><div><strong>{d.filename}</strong>{d.status!=null&&<p>{text(d.status)}</p>}{run.documentErrors.filter(e=>e.documentId===d.id||e.filename===d.filename).map((e,i)=><p className="document-error" key={i}>{e.message}</p>)}</div></div>)}{run.documentErrors.filter(e=>!run.documents.some(d=>e.documentId===d.id||e.filename===d.filename)).map((e,i)=><p className="error" key={i}>{e.filename||'Document error'}: {e.message}</p>)}</section>{run.terminal&&!result&&<p className="context-note">This run has no completed findings report. Review the reported status and document errors before submitting another package.</p>}{result&&<><div className="section-heading"><h2>Findings summary</h2><button className="secondary" onClick={download}><Icon name="download" size={17}/>Download JSON report</button></div><div className="stats"><div><span>Documents analyzed</span><strong>{result.documents_analyzed}</strong></div><div><span>Total findings</span><strong>{result.findings.length}</strong></div>{groups.filter(g=>counts(result)[g]>0).map(g=><div key={g}><span><i className={`severity-dot ${g}`}/>{g}</span><strong>{counts(result)[g]}</strong></div>)}</div>{result.findings.length===0?<div className="empty-result"><Icon name="check" size={28}/><h2>No findings were flagged in the uploaded package</h2><p>This result is not a compliance certification. Human review remains necessary.</p></div>:groups.map(group=>{const findings=result.findings.map((f,index)=>({f,index})).filter(({f})=>severityGroup(f.severity)===group);return findings.length>0&&<section className="severity-section" key={group}><h3><span className={`severity-dot ${group}`}/>{group==='Other'?'Other findings':`${group[0].toUpperCase()}${group.slice(1)} priority`}<span className="group-count">{findings.length}</span></h3>{findings.map(({f,index})=><FindingCard key={index} finding={f} onInspect={inspect} review={drafts[index]||run.reviews?.[f.id]} onReview={value=>{setDrafts(old=>({...old,[index]:value}));setReviewStates(old=>({...old,[index]:{message:'Unsaved changes',busy:false}}));}} onSaveReview={f.id?()=>save(f,index):undefined} reviewSaving={reviewStates[index]?.busy} reviewMessage={f.id?reviewStates[index]?.message:'A backend finding ID is required to save this review.'}/>)}</section>;})}{previous?.result&&<Comparison previous={{response:previous.result,filenames:previous.documents.map(d=>d.filename)}} current={{response:result,filenames:run.documents.map(d=>d.filename)}}/>}</>}</>}{selection&&<EvidenceDialog selection={selection} api={api} runId={runId} onClose={()=>setSelection(null)}/>}</section>;
}
function HistoryPage({api,base}) {
  const [runs,setRuns]=useState([]),[error,setError]=useState(null),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0);const heading=useRef(null);
  useEffect(()=>{heading.current?.focus();},[]);
  useEffect(()=>{let active=true;const controller=new AbortController();setLoading(true);setError(null);api.listRuns({signal:controller.signal}).then(data=>{if(active)setRuns(data);}).catch(failure=>{if(active&&failure.name!=='AbortError')setError(failure);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;controller.abort();};},[api,attempt]);
  return <section className="history-page"><div className="section-heading"><div><span className="eyebrow">REVIEW WORKSPACE</span><h1 className="workspace-title" ref={heading} tabIndex={-1}>Analysis history</h1></div><button className="secondary" disabled={loading} onClick={()=>setAttempt(old=>old+1)}>Refresh history</button></div><p className="section-description">{api.mode==='mock'?'Runs saved in this demo session. Refreshing the browser clears demo data.':'Saved runs for your authenticated account.'}</p><ErrorMessage error={error}/>{loading&&<p className="loading-line" role="status">Loading saved runs…</p>}{!loading&&!error&&!runs.length&&<div className="empty-result"><Icon name="file" size={26}/><h2>Your first review starts here.</h2><p>Submit an evidence package to create an analysis run.</p><Link className="secondary" to={base}>Start an analysis</Link></div>}<ul className="history-list">{runs.map(run=><li key={run.id}><div><span className="eyebrow">{text(run.status)}</span><h2>{run.documents.map(d=>d.filename).join(', ')||'Evidence package'}</h2><p>{formatDate(run.createdAt)} · {run.result?`${run.result.findings.length} findings`:'No completed report'}</p><span className="fineprint">Run {run.id}</span></div><Link className="secondary" to={`${base}/runs/${encodeURIComponent(run.id)}`}>Open run <Icon name="arrow" size={16}/></Link></li>)}</ul></section>;
}
