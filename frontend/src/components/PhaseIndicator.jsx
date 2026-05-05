const PHASES = {
  explore:   { label: 'Exploring',    desc: 'Build your intuition.',          color: '#60a5fa', bg: '#1e3a5f' },
  construct: { label: 'Constructing', desc: 'Stress-test your model.',        color: '#a78bfa', bg: '#2d1f5e' },
  confirm:   { label: 'Confirmed',    desc: 'You have earned this.',          color: '#34d399', bg: '#1a3d2e' },
};

export default function PhaseIndicator({ phase, phaseAdvanced }) {
  const p = PHASES[phase] || PHASES.explore;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 14px',
      background: p.bg, borderRadius:'8px', border:`1px solid ${p.color}22`, transition:'all 0.4s ease' }}>
      <div style={{ width:'8px', height:'8px', borderRadius:'50%',
        background: p.color, boxShadow:`0 0 6px ${p.color}`, flexShrink:0 }} />
      <div>
        <div style={{ fontSize:'12px', fontWeight:'600', color: p.color }}>{p.label}</div>
        <div style={{ fontSize:'11px', color:'#6b7280' }}>{p.desc}</div>
      </div>
    </div>
  );
}