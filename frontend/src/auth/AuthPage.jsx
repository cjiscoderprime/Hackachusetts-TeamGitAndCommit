import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { Link, navigate } from '../router.jsx';
import { brandAssets } from '../brand.js';
import { googleEnabled, beginGoogleSignIn } from './google.js';
export default function AuthPage({ signup = false }) {
  const auth = useAuth(), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const heading = useRef(null), lock = useRef(false);
  const [googleAvailable,setGoogleAvailable]=useState(null),[googleBusy,setGoogleBusy]=useState(false);
  useEffect(()=>{
    if(!auth.configured)return;
    const controller=new AbortController();
    googleEnabled({url:import.meta.env.VITE_SUPABASE_URL,key:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,signal:controller.signal}).then(setGoogleAvailable).catch(()=>{});
    return()=>controller.abort();
  },[auth.configured]);
  async function googleSignIn(){
    if(!auth.client||lock.current)return;lock.current=true;setGoogleBusy(true);setError('');setMessage('');
    try{
      const enabled=await googleEnabled({url:import.meta.env.VITE_SUPABASE_URL,key:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY});
      setGoogleAvailable(enabled);
      if(!enabled)throw new Error('Google sign-in is not yet enabled for this workspace. Please use email for now.');
      await beginGoogleSignIn(auth.client,window.location.origin);
    }catch(failure){setError(failure.message||'Google sign-in could not be started.');}
    finally{lock.current=false;setGoogleBusy(false);}
  }
  useEffect(() => { heading.current?.focus(); }, [signup]);
  useEffect(() => { if (!auth.loading && auth.user) navigate('/app', { replace: true }); }, [auth.loading, auth.user]);
  async function submit(event) {
    event.preventDefault(); if (!auth.client || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const credentials = { email: email.trim(), password };
      const { data, error: failure } = signup ? await auth.client.auth.signUp({ ...credentials, options: { emailRedirectTo: `${window.location.origin}/login` } }) : await auth.client.auth.signInWithPassword(credentials);
      if (failure) throw failure;
      setPassword('');
      if (data.session) navigate('/app', { replace: true });
      else setMessage(signup ? 'Check your email to confirm your account, then sign in. If you already have an account, use Sign in.' : 'No active session was returned. Please confirm your email and sign in.');
    } catch (failure) { setError(failure.message || 'Sign-in could not be completed. Please retry.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="auth-layout"><div className="auth-intro">{brandAssets.logo&&<img className="auth-logo" src={brandAssets.logo} alt="BioLyze scientific evidence review"/>}<span className="eyebrow">YOUR RESEARCH WORKSPACE</span><h1>Evidence worth<br/> looking into.</h1><p>Keep your analysis, source evidence, and review notes together in one considered workspace.</p><ul><li>Trace findings to original documents</li><li>Reopen saved analysis runs</li><li>Record your scientific review</li></ul></div><div className="auth-card"><span className="eyebrow">BIOLYZE ACCOUNT</span><h2 ref={heading} tabIndex={-1}>{signup ? 'Create your account' : 'Welcome back'}</h2><p>{signup ? 'Start a personal evidence review workspace.' : 'Sign in to access your saved reviews.'}</p>{!auth.configured && <div className="context-note">{auth.configurationError || 'Account access is awaiting Supabase project configuration. You can explore the separate demo workspace below.'}</div>}<div className="social-auth"><button type="button" className="google-button" disabled={busy || googleBusy || auth.loading || !auth.configured || googleAvailable===false} onClick={googleSignIn}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.06a10 10 0 0 0 0 9.04l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.78.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.34 2.59C7.19 7.71 9.4 5.95 12 5.95Z"/></svg>{googleBusy?'Connecting to Google…':'Continue with Google'}</button>{googleAvailable===false&&<p className="fineprint google-setup">Google sign-in is being configured. You can continue with email.</p>}<div className="auth-divider"><span>or continue with email</span></div></div><form onSubmit={submit}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy || googleBusy || !auth.configured}/></label><label>Password<input type="password" autoComplete={signup?'new-password':'current-password'} minLength={signup?8:undefined} required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy || googleBusy || !auth.configured}/></label>{signup && <p className="fineprint">Use at least 8 characters. Your project’s password policy may require more.</p>}{(error || auth.error) && <p className="error" role="alert">{error || auth.error}</p>}{message && <p className="success-message" role="status">{message}</p>}<button className="primary" disabled={busy || googleBusy || auth.loading || !auth.configured}>{busy?'Please wait…':signup?'Create account':'Sign in'}</button></form><p className="auth-switch">{signup?'Already have an account?':'New to BioLyze?'} <Link to={signup?'/login':'/signup'}>{signup?'Sign in':'Create an account'}</Link></p><Link className="demo-entry" to="/demo">Explore the demo workspace →</Link><p className="fineprint">Demo mode does not create an account or analyze your uploaded documents.</p></div></section>;
}
