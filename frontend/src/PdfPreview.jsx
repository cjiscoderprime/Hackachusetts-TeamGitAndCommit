import React, { useEffect, useRef, useState } from 'react';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
export default function PdfPreview({ blob, initialPage = 1 }) {
  const [pdf,setPdf]=useState(null),[pageNumber,setPageNumber]=useState(1),[error,setError]=useState(''),[loading,setLoading]=useState(true),[pageText,setPageText]=useState(''),[width,setWidth]=useState(280);
  const host=useRef(null),canvas=useRef(null);
  useEffect(()=>{
    const observer=new ResizeObserver(entries=>setWidth(Math.max(160,Math.floor(entries[0].contentRect.width))));
    if(host.current)observer.observe(host.current);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    let active=true,task;
    (async()=>{
      try {
        const {getDocument,GlobalWorkerOptions}=await import('pdfjs-dist/legacy/build/pdf.mjs');
        GlobalWorkerOptions.workerSrc=workerUrl;
        const data=new Uint8Array(await blob.arrayBuffer());if(!active)return;
        task=getDocument({data,isEvalSupported:false});const document=await task.promise;
        if(!active)return;setPdf(document);setPageNumber(Math.max(1,Math.min(initialPage,document.numPages)));
      } catch(failure){if(active){setError(`Unable to render PDF: ${failure.message}`);setLoading(false);}}
    })();
    return()=>{active=false;task?.destroy();};
  },[blob,initialPage]);
  useEffect(()=>{
    if(!pdf)return;let active=true,renderTask;setLoading(true);setError('');setPageText('');
    (async()=>{
      try{
        const page=await pdf.getPage(pageNumber);if(!active)return;
        const original=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(width,1000)/original.width});
        const outputScale=Math.min(window.devicePixelRatio||1,2),target=canvas.current;
        target.width=Math.floor(viewport.width*outputScale);target.height=Math.floor(viewport.height*outputScale);
        target.style.width=`${Math.floor(viewport.width)}px`;target.style.height=`${Math.floor(viewport.height)}px`;
        renderTask=page.render({canvasContext:target.getContext('2d'),viewport,transform:[outputScale,0,0,outputScale,0,0]});
        await renderTask.promise;
        const content=await page.getTextContent();
        if(active){setPageText(content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join(''));setLoading(false);}
      }catch(failure){if(active&&failure.name!=='RenderingCancelledException'){setError(`Unable to render this page: ${failure.message}`);setLoading(false);}}
    })();
    return()=>{active=false;renderTask?.cancel();};
  },[pdf,pageNumber,width]);
  return <div className="pdf-reader" ref={host}><div className="pdf-toolbar"><button className="secondary" disabled={!pdf||pageNumber<=1} onClick={()=>setPageNumber(n=>n-1)}>Previous page</button><label>Page<input type="number" min="1" max={pdf?.numPages||1} value={pageNumber} disabled={!pdf} onChange={e=>setPageNumber(Math.max(1,Math.min(pdf.numPages,Number(e.target.value)||1)))}/><span>of {pdf?.numPages||'…'}</span></label><button className="secondary" disabled={!pdf||pageNumber>=pdf.numPages} onClick={()=>setPageNumber(n=>n+1)}>Next page</button></div>{initialPage>(pdf?.numPages||Infinity)&&<p className="context-note">The cited page exceeds this document’s page count. Showing the last available page.</p>}{loading&&<p role="status" className="fineprint">Rendering PDF page…</p>}{error&&<p className="error" role="alert">{error}</p>}<canvas ref={canvas} role="img" aria-label={`Source PDF page ${pageNumber}. Read extracted page text below.`}/>{pageText&&<details className="page-text"><summary>Read extracted page text</summary><pre>{pageText}</pre></details>}</div>;
}
