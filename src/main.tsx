import React, { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import { ArrowUpRight, BookOpen, Check, Circle, Dumbbell, LayoutDashboard, ListTodo, LogOut, Sprout, Wallet, Workflow } from 'lucide-react';
import { supabase } from './supabase';
import './style.css';
import './tasks.css';
const TaskManager = lazy(() => import('./TaskManager').then(module => ({ default: module.TaskManager })));
const Dashboard = lazy(() => import('./Dashboard').then(module => ({ default: module.Dashboard })));
const Expenses = lazy(() => import('./Expenses').then(module => ({ default: module.Expenses })));
const Learning = lazy(() => import('./Learning').then(module => ({ default: module.Learning })));
const Knowledge = lazy(() => import('./Knowledge').then(module => ({ default: module.Knowledge })));
const Exercise = lazy(() => import('./Exercise').then(module => ({ default: module.Exercise })));

const sections = [
  { name: 'Overview', icon: LayoutDashboard, description: 'Your daily rhythm, in one place.', next: 'Your dashboard will come to life as you start tracking tasks, reading, focus, and spending.' },
  { name: 'Task manager', icon: ListTodo, description: 'Make room for what matters.', next: 'Daily tasks, repeating targets, and your weekday and weekend routines are the next section to build.' },
  { name: 'AI learning', icon: Workflow, description: 'From a first script to real-world automation.', next: 'Your 26-week roadmap, project milestones, and progress tree will live here.' },
  { name: 'Exercise', icon: Dumbbell, description: 'Build strength, one good session at a time.', next: 'Your weekly split, movement progressions, and workout logs will live here.' },
  { name: 'Knowledge', icon: BookOpen, description: 'Learn a little. Carry it with you.', next: 'Verified Hadiths, Ayahs, Duas, and your reading collection will live here.' },
  { name: 'Expenses', icon: Wallet, description: 'Keep your money in view, one thoughtful entry at a time.', next: '' },
];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'recovery'>('login');
  const [section, setSection] = useState(0);
  const [database, setDatabase] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [dbError, setDbError] = useState('');
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60000);
    if (!supabase) { setLoading(false); setError('Add your Supabase connection details to .env.local, then restart the app.'); return () => clearInterval(timer); }
    const { data } = supabase.auth.onAuthStateChange((event, current) => {
      setSession(current); setLoading(false);
      if (event === 'PASSWORD_RECOVERY') setMode('recovery');
    });
    supabase.auth.getSession().then(({ error }) => { if (error) { setError(error.message); setLoading(false); } }).catch((e: Error) => { setError(e.message); setLoading(false); });
    return () => { data.subscription.unsubscribe(); clearInterval(timer); };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session || !supabase) return;
    setDatabase('checking');
    supabase.from('profiles').upsert({ id: session.user.id }, { onConflict: 'id', ignoreDuplicates: true })
      .then(({ error }) => {
        if (!active) return;
        setDatabase(error ? 'missing' : 'ready'); setDbError(error?.message ?? '');
      });
    return () => { active = false; };
  }, [session?.user.id]);

  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setError(''); setNotice('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) setNotice('Check your email to confirm your account, then sign in.');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error; setNotice('If an account exists for this email, a reset link will be sent.');
      } else if (mode === 'recovery') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error; setMode('login'); setNotice('Your password has been updated.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true); const { error } = await supabase.auth.signOut(); setBusy(false);
    if (error) setError(error.message); else { setMode('login'); setNotice(''); setError(''); }
  }

  if (loading) return <div className="loading" role="status"><Sprout size={32}/> Opening your space…</div>;
  if (!session || mode === 'recovery') return <div className="auth-layout">
    <section className="auth-story"><a className="brand" href="/">1Life<span>●</span></a><div><span className="eyebrow">A LITTLE MORE INTENTIONAL</span><h1>One life.<br/>Every day counts.</h1><p>A quiet space for your goals, your growth,<br/>and the things that ground you.</p><div className="story-line"/><span className="story-footer">Faith. Focus. Forward.</span></div><span className="small">YOUR EVERYDAY, WITH PURPOSE</span></section>
    <main className="auth-main"><div className="auth-card"><div className="plant"><Sprout size={26}/></div><span className="eyebrow">WELCOME TO YOUR SPACE</span><h2>{mode === 'signup' ? 'Start your next chapter.' : mode === 'reset' ? 'A fresh start.' : mode === 'recovery' ? 'Choose a new password.' : 'Welcome back.'}</h2><p>{mode === 'signup' ? 'Small steps. A meaningful life.' : mode === 'reset' ? 'We’ll send a password reset link to your email.' : mode === 'recovery' ? 'Use at least eight characters.' : 'Take a breath. Pick up where you left off.'}</p>
      <form onSubmit={authenticate}>
        {mode !== 'recovery' && <label>Email address<input required type="email" name="email" autoComplete="email" placeholder="you@example.com"/></label>}
        {mode !== 'reset' && <label>Password<input required type="password" name="password" minLength={mode === 'login' ? 1 : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Your password"/></label>}
        {error && <p className="message error" role="alert">{error}</p>}{notice && <p className="message" role="status">{notice}</p>}
        <button className="primary" disabled={busy || !supabase}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : mode === 'recovery' ? 'Update password' : 'Sign in'}<ArrowUpRight size={18}/></button>
      </form>
      {mode !== 'recovery' && <div className="auth-links"><button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setNotice(''); }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button><button onClick={() => { setMode(mode === 'reset' ? 'login' : 'reset'); setError(''); setNotice(''); }}>{mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}</button></div>}
      <div className="auth-note"><span className="status-dot"/> A space for your personal progress.</div>
    </div></main>
  </div>;

  const selected = sections[section];
  return <div className="app-layout"><aside className="sidebar"><a className="brand" href="/">1Life<span>●</span></a><span className="workspace-label">YOUR PERSONAL SPACE</span><nav aria-label="Main navigation">{sections.map(({name, icon: Icon}, i) => <button key={name} className={i === section ? 'nav-item active' : 'nav-item'} aria-current={i === section ? 'page' : undefined} onClick={() => setSection(i)}><Icon size={19}/>{name}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-quote">Small steps.<br/><strong>Steady growth.</strong><Sprout size={32}/></div><span className="account-email">{session.user.email}</span><button className="nav-item" disabled={busy} onClick={signOut}><LogOut size={18}/>Sign out</button></div></aside>
    <main className="workspace"><header><span>My workspace <span className="breadcrumb">/ {selected.name}</span></span><span className="date">{today.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span></header>
      <div className="page-content"><span className="eyebrow">MAKE TODAY MEANINGFUL</span><div className="page-title"><div><h1>{section === 0 ? 'A fresh beginning.' : selected.name}</h1><p>{selected.description}</p></div><span className="pill">Asia/Dhaka</span></div>
      {error && <p className="message error" role="alert">{error}</p>}{notice && <p className="message" role="status">{notice}</p>}
      <Suspense fallback={<p className="empty-state" role="status">Opening your space…</p>}>{section === 0 ? <Dashboard key={session.user.id} userId={session.user.id} navigate={setSection}/> : section === 1 ? <TaskManager key={session.user.id} userId={session.user.id}/> : section === 2 ? <Learning key={session.user.id} userId={session.user.id}/> : section === 3 ? <Exercise key={session.user.id} userId={session.user.id}/> : section === 4 ? <Knowledge key={session.user.id} userId={session.user.id}/> : section === 5 ? <Expenses key={session.user.id} userId={session.user.id} navigate={setSection}/> : <><section className="welcome-panel"><div><span className="eyebrow">YOUR 1LIFE JOURNEY</span><h2>Build a life you<br/>feel good about.</h2><p>Make space for learning, movement, and faith.<br/>One intentional day at a time.</p><span className="welcome-tag"><Sprout size={16}/> Rooted in purpose</span></div><div className="growth-art" aria-hidden="true"><div className="orbit one"/><div className="orbit two"/><Sprout size={115} strokeWidth={1}/><span className="spark">✦</span></div></section>
      <div className="section-heading"><h2>{section === 0 ? 'Your space is taking shape' : 'Coming in its own time'}</h2><span>FOUNDATION · 01</span></div>
      <div className="foundation-grid"><section className="card"><div className="card-icon"><selected.icon size={23}/></div><h3>{section === 0 ? 'Start with your daily rhythm' : selected.name}</h3><p>{selected.next}</p>{section === 0 && <button className="text-link" onClick={() => setSection(1)}>Explore task manager <ArrowUpRight size={17}/></button>}<span className="subtle-label">Planned section · No activity recorded yet</span></section>
      <section className="card"><span className="eyebrow">GETTING STARTED</span><h3>A strong foundation</h3><div className="check-row"><Check size={17}/><span>Signed in to your personal account</span></div><div className="check-row">{database === 'ready' ? <Check size={17}/> : <Circle size={17}/>}<span>{database === 'checking' ? 'Checking your database…' : database === 'ready' ? 'Profile connected to Supabase' : 'Database setup needs attention'}</span></div><div className="check-row muted"><Circle size={17}/><span>Set up your first daily targets</span></div>{database === 'missing' && <div className="message error" role="alert">Apply the foundation migration in Supabase SQL Editor, then reload.<details><summary>Connection details</summary>{dbError}</details></div>}</section></div>
      </>}</Suspense><footer><Sprout size={16}/><span>Progress begins with showing up.</span><span className="footer-right">1Life · Faith. Focus. Forward.</span></footer></div>
    </main></div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
