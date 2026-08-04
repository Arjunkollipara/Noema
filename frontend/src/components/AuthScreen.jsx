import { useState } from 'react';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#060608',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 'auto auto 12% 18%',
        width: '28vw',
        height: '28vw',
        minWidth: '240px',
        minHeight: '240px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.08), rgba(245,158,11,0) 70%)',
        filter: 'blur(10px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        inset: '18% 14% auto auto',
        width: '34vw',
        height: '34vw',
        minWidth: '260px',
        minHeight: '260px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(45,212,191,0.06), rgba(45,212,191,0) 70%)',
        filter: 'blur(14px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '340px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
        zIndex: 2,
      }}>
        <div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#f0f0f8',
            letterSpacing: '-0.04em',
            marginBottom: '6px',
          }}>
            noema
          </div>
          <div style={{ fontSize: '13px', color: '#2a2a3e' }}>
            {mode === 'login' ? 'welcome back.' : 'start mapping your mind.'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              background: '#0e0e18',
              border: '1px solid #1a1a28',
              borderRadius: '8px',
              padding: '11px 14px',
              color: '#e8e8f0',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              background: '#0e0e18',
              border: '1px solid #1a1a28',
              borderRadius: '8px',
              padding: '11px 14px',
              color: '#e8e8f0',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {error && (
          <div style={{
            fontSize: '12px',
            color: '#ef4444',
            padding: '8px 12px',
            background: '#1a0e0e',
            borderRadius: '6px',
            border: '1px solid #2a1a1a',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email.trim() || !password.trim()}
          style={{
            padding: '11px',
            borderRadius: '8px',
            border: 'none',
            background: email.trim() && password.trim() && !loading ? '#f59e0b' : '#1a1a28',
            color: email.trim() && password.trim() && !loading ? '#060608' : '#3a3a4e',
            fontSize: '14px',
            fontWeight: '600',
            cursor: email.trim() && password.trim() && !loading ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
          }}
        >
          {loading ? '...' : mode === 'login' ? 'enter' : 'begin'}
        </button>

        <button
          onClick={() => {
            setMode(m => (m === 'login' ? 'register' : 'login'));
            setError('');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#2a2a3e',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'color 0.15s',
          }}
          onMouseOver={e => { e.target.style.color = '#6b7280'; }}
          onMouseOut={e => { e.target.style.color = '#2a2a3e'; }}
        >
          {mode === 'login' ? 'no account? begin here' : 'already here? enter'}
        </button>
      </div>
    </div>
  );
}
