export default function HUD({ nodeCount, onThink, onNewNode, onLogout }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      padding: '20px 28px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 100,
      background: 'linear-gradient(to bottom, rgba(6,6,8,0.8) 0%, transparent 100%)',
      pointerEvents: 'none',
      transition: 'opacity 0.3s ease',
    }}>
      <style>{`
        .hud-btn {
          pointer-events: auto;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .hud-btn:hover { opacity: 0.75; }
      `}</style>

      <div style={{ pointerEvents: 'auto' }}>
        <span style={{
          fontSize: '15px',
          fontWeight: '700',
          color: '#f0f0f8',
          letterSpacing: '-0.03em',
        }}>
          noema
        </span>
        {nodeCount > 0 && (
          <span style={{
            fontSize: '11px',
            color: '#2a2a3e',
            marginLeft: '10px',
            fontWeight: '400',
          }}>
            {nodeCount} {nodeCount === 1 ? 'concept' : 'concepts'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
        <button
          className="hud-btn"
          onClick={onThink}
          style={{
            padding: '7px 16px',
            background: '#f59e0b',
            color: '#0a0a0f',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          Think
        </button>
        <button
          className="hud-btn"
          onClick={onNewNode}
          style={{
            padding: '7px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #1e1e2e',
            color: '#6b7280',
            borderRadius: '20px',
            fontSize: '13px',
          }}
        >
          + Node
        </button>
        <button
          className="hud-btn"
          onClick={onLogout}
          style={{
            padding: '7px 12px',
            background: 'none',
            border: '1px solid #1a1a28',
            color: '#3a3a4e',
            borderRadius: '20px',
            fontSize: '12px',
          }}
        >
          out
        </button>
      </div>
    </div>
  );
}
