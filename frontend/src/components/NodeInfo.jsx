import { decayToVisual } from '../utils/decay';

const PHASE_COLORS = {
  explore: '#60a5fa',
  construct: '#a78bfa',
  confirm: '#34d399',
};

const STAGE_LABELS = {
  1: 'Ignition',
  2: 'Forming',
  3: 'Constructing',
  4: 'Predictive',
  5: 'Mastery',
};

export default function NodeInfo({ node, onEnterChat, onDelete, onClose }) {
  if (!node) return null;

  const { colour } = decayToVisual(node.decay_score);
  const stage = node.cognitive_stage || 1;
  const stageLabel = STAGE_LABELS[stage] || 'Ignition';
  const phaseColor = PHASE_COLORS[node.phase] || '#60a5fa';
  const summary = node.mvi_state?.current_summary || node.summary || null;
  const daysSince = node.last_visited
    ? Math.floor((Date.now() - new Date(node.last_visited)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '32px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '420px',
      background: '#0e0e18',
      border: '1px solid #1e1e2e',
      borderRadius: '16px',
      padding: '20px 24px',
      zIndex: 200,
      animation: 'cardUp 0.2s ease',
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
    }}>
      <style>{`
        @keyframes cardUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ flex: 1, paddingRight: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#f0f0f8', lineHeight: 1.3 }}>
            {node.title}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: phaseColor, fontWeight: '500' }}>
              {node.phase}
            </span>
            <span style={{ fontSize: '11px', color: '#3a3a4e' }}>·</span>
            <span style={{ fontSize: '11px', color: colour, fontWeight: '500' }}>
              {Math.round(node.decay_score * 100)}% memory
            </span>
            <span style={{ fontSize: '11px', color: '#3a3a4e' }}>·</span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>
              Stage {stage} - {stageLabel}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          color: '#3a3a4e',
          fontSize: '18px',
          cursor: 'pointer',
          lineHeight: 1,
          padding: '2px',
        }}>
          ×
        </button>
      </div>

      {summary && (
        <div style={{
          fontSize: '13px',
          color: '#9ca3af',
          lineHeight: '1.65',
          marginBottom: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid #1a1a28',
        }}>
          {summary}
        </div>
      )}

      {node.mvi_state?.frontier?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '10px',
            color: '#3a3a4e',
            fontWeight: '500',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            Open questions
          </div>
          {node.mvi_state.frontier.slice(0, 2).map((f, i) => (
            <div
              key={i}
              style={{
                fontSize: '12px',
                color: '#4a4a6e',
                lineHeight: '1.5',
                paddingLeft: '10px',
                borderLeft: '1px solid #2a2a3e',
                marginBottom: '4px',
              }}
            >
              {f}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onEnterChat(node)}
          style={{
            flex: 1,
            padding: '9px',
            borderRadius: '8px',
            background: '#f59e0b',
            border: 'none',
            color: '#0a0a0f',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          {'Enter ->'}
        </button>
        <button
          onClick={() => onDelete(node.id)}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            background: 'none',
            border: '1px solid #1e1e2e',
            color: '#4a4a6e',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Delete
        </button>
        <div style={{
          padding: '9px 12px',
          borderRadius: '8px',
          background: '#1a1a28',
          border: '1px solid #1e1e2e',
          fontSize: '11px',
          color: '#3a3a4e',
          display: 'flex',
          alignItems: 'center',
        }}>
          {daysSince === null ? '-' : daysSince === 0 ? 'today' : `${daysSince}d ago`}
        </div>
      </div>
    </div>
  );
}
