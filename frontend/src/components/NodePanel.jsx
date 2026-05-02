import { decayToVisual } from '../utils/decay';

const APP_LOADED_AT = Date.now();

const PHASE_LABELS = {
  explore: { label: 'Exploring', color: '#60a5fa' },
  construct: { label: 'Constructing', color: '#a78bfa' },
  confirm: { label: 'Confirmed', color: '#34d399' },
};

export default function NodePanel({ node, onClose, onDelete, onEnterChat }) {
  if (!node) return null;

  const { colour } = decayToVisual(node.decay_score);
  const phase = PHASE_LABELS[node.phase] || PHASE_LABELS.explore;
  const daysSince = node.last_visited
    ? Math.floor((APP_LOADED_AT - new Date(node.last_visited)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      height: '100%',
      width: '320px',
      background: '#12121a',
      borderLeft: '1px solid #1e1e2e',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      zIndex: 100,
      animation: 'slideIn 0.2s ease',
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .panel-btn {
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: opacity 0.15s;
        }
        .panel-btn:hover { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f0f0f8', lineHeight: 1.3 }}>
          {node.title}
        </h2>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#6b7280',
          fontSize: '20px', cursor: 'pointer', padding: '0 0 0 8px',
          lineHeight: 1,
        }}>x</button>
      </div>

      {/* Phase badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: '#1e1e2e', borderRadius: '6px', padding: '6px 10px',
        width: 'fit-content',
      }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: phase.color,
        }} />
        <span style={{ fontSize: '12px', color: phase.color, fontWeight: '500' }}>
          {phase.label}
        </span>
      </div>

      {/* Decay info */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{
          flex: 1, background: '#1e1e2e', borderRadius: '8px', padding: '12px',
        }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
            MEMORY STRENGTH
          </div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: colour }}>
            {Math.round(node.decay_score * 100)}%
          </div>
        </div>
        <div style={{
          flex: 1, background: '#1e1e2e', borderRadius: '8px', padding: '12px',
        }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
            LAST VISITED
          </div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#e8e8f0' }}>
            {daysSince === null ? '-' : daysSince === 0 ? 'Today' : `${daysSince}d ago`}
          </div>
        </div>
      </div>

      {/* Summary */}
      {node.summary && (
        <div style={{
          background: '#1e1e2e', borderRadius: '8px', padding: '12px',
          fontSize: '13px', color: '#9ca3af', lineHeight: '1.6',
        }}>
          {node.summary}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
        <button
          className="panel-btn"
          onClick={() => onEnterChat(node)}
          style={{ background: '#f59e0b', color: '#0a0a0f' }}
        >
          Enter Node -
        </button>
        <button
          className="panel-btn"
          onClick={() => onDelete(node.id)}
          style={{ background: '#1e1e2e', color: '#ef4444', border: '1px solid #2a2a3e' }}
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}
