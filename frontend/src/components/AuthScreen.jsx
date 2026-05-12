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
      
      const contentType = res.headers.get('content-type');
      let data = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        throw new Error(data.error || `Server responded with ${res.status}`);
      }
      
      onAuth(data);
    } catch (err) {
      setError(err.message === 'Unexpected end of JSON input' 
        ? 'Backend connection failed. Please check if the server is running.' 
        : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '360px', background: '#12121a', borderRadius: '16px',
        border: '1px solid #1e1e2e', padding: '36px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f0f0f8', letterSpacing: '-0.02em' }}>
            noema
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            {mode === 'login' ? 'Welcome back.' : 'Start mapping your mind.'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              background: '#0a0a0f', border: '1px solid #2a2a3e',
              borderRadius: '8px', padding: '10px 14px',
              color: '#e8e8f0', fontSize: '14px', outline: 'none',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              background: '#0a0a0f', border: '1px solid #2a2a3e',
              borderRadius: '8px', padding: '10px 14px',
              color: '#e8e8f0', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        {error && (
          <div style={{ fontSize: '13px', color: '#ef4444', background: '#2a1a1a',
            border: '1px solid #3a2a2a', borderRadius: '6px', padding: '8px 12px' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email.trim() || !password.trim()}
          style={{
            padding: '10px', borderRadius: '8px', border: 'none',
            background: email.trim() && password.trim() && !loading ? '#f59e0b' : '#1e1e2e',
            color: email.trim() && password.trim() && !loading ? '#0a0a0f' : '#6b7280',
            fontSize: '14px', fontWeight: '600',
            cursor: email.trim() && password.trim() && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          style={{
            background: 'none', border: 'none', color: '#6b7280',
            fontSize: '13px', cursor: 'pointer', textAlign: 'center',
          }}
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
