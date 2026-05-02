import { useState } from 'react';

export default function CreateNodeModal({ onConfirm, onCancel, parentNode }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');

  function handleSubmit() {
    if (!title.trim()) return;
    onConfirm({ title: title.trim(), summary: summary.trim() || undefined });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }}>
      <div style={{
        background: '#12121a', borderRadius: '12px', padding: '28px',
        width: '400px', border: '1px solid #1e1e2e',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f0f0f8' }}>
          {parentNode ? `New node from "${parentNode.title}"` : 'New node'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: '#6b7280' }}>CONCEPT</label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. Gradient Descent"
            style={{
              background: '#0a0a0f', border: '1px solid #2a2a3e',
              borderRadius: '8px', padding: '10px 12px',
              color: '#e8e8f0', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', color: '#6b7280' }}>
            BRIEF DESCRIPTION <span style={{ color: '#3a3a4e' }}>(optional)</span>
          </label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="What do you already know about this?"
            rows={3}
            style={{
              background: '#0a0a0f', border: '1px solid #2a2a3e',
              borderRadius: '8px', padding: '10px 12px',
              color: '#e8e8f0', fontSize: '14px', outline: 'none',
              resize: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid #2a2a3e',
            background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: title.trim() ? '#f59e0b' : '#2a2a3e',
              color: title.trim() ? '#0a0a0f' : '#6b7280',
              cursor: title.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px', fontWeight: '500',
            }}
          >
            Create Node
          </button>
        </div>
      </div>
    </div>
  );
}
