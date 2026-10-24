import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './auth/AuthProvider.jsx';
import AuthPage from './auth/AuthPage.jsx';
import Workspace from './Workspace.jsx';
import { Link, navigate, useRoute } from './router.jsx';
import { Icon, Disclaimer } from './components.jsx';
import { brandAssets } from './brand.js';
import { MOCK_MODE } from './api.js';
import './style.css';
function App() {
  const path=useRoute(),auth=useAuth(),[signingOut,setSigningOut]=useState(false),[logoutError,setLogoutError]=useState('');
  const logoutLock=useRef(false);
  const demo=path==='/demo'||path.startsWith('/demo/');
  const protectedRoute=path==='/app'||path.startsWith('/app/');
  useEffect(()=>{
    if(path==='/')navigate(auth.user?'/app':'/login',{replace:true});
    else if(protectedRoute&&!auth.loading&&!auth.user)navigate('/login',{replace:true});
  },[path,protectedRoute,auth.loading,auth.user]);
  async function logout(){if(logoutLock.current)return;logoutLock.current=true;setSigningOut(true);setLogoutError('');try{await auth.signOut();navigate('/login',{replace:true});}catch(error){setLogoutError(error.message||'Sign-out failed. Please retry.');}finally{logoutLock.current=false;setSigningOut(false);}}
  const workspaceAllowed=demo||(protectedRoute&&!auth.loading&&auth.user);
  return <><header className="topbar"><Link className="brand" to={auth.user?'/app':'/login'}><span className="brand-mark">{brandAssets.logo?<img src={brandAssets.logo} alt=""/>:<Icon name="layers" size={24}/>}</span>BioLyze<span className="brand-ai">AI</span></Link><div className="header-right">{auth.user?<><span className="account-email" title={auth.user.email}>{auth.user.email}</span><button className="secondary" disabled={signingOut} onClick={logout}>{signingOut?'Signing out…':'Log out'}</button></>:demo?<Link className="secondary" to="/login">Sign in</Link>:<span className="workspace-tag">RESEARCH WORKSPACE</span>}</div></header><main>{logoutError&&<p className="error" role="alert">{logoutError}</p>}{signingOut?<p className="loading-line" role="status">Closing your workspace…</p>:workspaceAllowed?<Workspace key={demo?'public-demo':`${auth.user.id}-${MOCK_MODE?'mock':'live'}`} path={path} publicDemo={demo}/>:auth.loading?<p className="loading-line" role="status">Restoring your session…</p>:path==='/signup'?<AuthPage key="signup" signup/>:path==='/login'||path==='/'||protectedRoute?<AuthPage key="login"/>:<section className="auth-card"><h1 className="workspace-title">Page not found</h1><Link to="/login">Return to sign in</Link></section>}<Disclaimer/><div className="bottom-brand"><span>BioLyze AI</span><span>Built for a more considered review.</span><span>HACKACHUSETTS 2026</span></div></main></>;
}
createRoot(document.getElementById('root')).render(<AuthProvider><App/></AuthProvider>);
