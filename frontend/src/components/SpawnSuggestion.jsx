import { useState } from 'react';

export default function SpawnSuggestion({ onSpawn, onDismiss }) {
  const [title, setTitle] = useState('');
  return (
    <div style={{ margin:'12px 0', padding:'14px', background:'#1a2a1a',
      border:'1px solid #2a4a2a', borderRadius:'10px', display:'flex', flexDirection:'column', gap:'10px' }}>
      <div style={{ fontSize:'12px', color:'#34d399', fontWeight:'500' }}>✦ New concept discovered</div>
      <div style={{ fontSize:'13px', color:'#9ca3af' }}>What concept do you want to explore from here?</div>
      <div style={{ display:'flex', gap:'8px' }}>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && title.trim() && onSpawn(title.trim())}
          placeholder="Name the concept..."
          style={{ flex:1, background:'#0a0a0f', border:'1px solid #2a3a2a', borderRadius:'6px',
            padding:'8px 10px', color:'#e8e8f0', fontSize:'13px', outline:'none' }} />
        <button onClick={() => title.trim() && onSpawn(title.trim())} disabled={!title.trim()}
          style={{ padding:'8px 14px', background: title.trim() ? '#34d399' : '#1a2a1a',
            color: title.trim() ? '#0a0a0f' : '#6b7280', border:'none', borderRadius:'6px',
            cursor: title.trim() ? 'pointer' : 'not-allowed', fontSize:'13px', fontWeight:'500' }}>
          Spawn
        </button>
        <button onClick={onDismiss} style={{ padding:'8px 10px', background:'none',
          border:'1px solid #2a2a3e', borderRadius:'6px', color:'#6b7280', cursor:'pointer', fontSize:'13px' }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}