import { useState, useEffect, useRef } from 'react';
import { fetchHistory, sendMessage, fetchProvider, createNode } from '../utils/api';
import MessageBubble from './MessageBubble';
import PhaseIndicator from './PhaseIndicator';
import SpawnSuggestion from './SpawnSuggestion';

export default function ChatPanel({ node, onClose, onNodeSpawned }) {
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentPhase, setCurrentPhase] = useState(node.phase);
  const [phaseAdvanced, setPhaseAdvanced] = useState(false);
  const [showSpawn, setShowSpawn]       = useState(false);
  const [provider, setProvider]         = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    fetchHistory(node.id)
      .then(data => {
        setMessages(data.messages);
        if (data.messages.length > 0)
          setCurrentPhase(data.messages[data.messages.length - 1].phase);
      })
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
    fetchProvider().then(setProvider).catch(() => {});
    inputRef.current?.focus();
  }, [node.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    if (phaseAdvanced) {
      const t = setTimeout(() => setPhaseAdvanced(false), 1500);
      return () => clearTimeout(t);
    }
  }, [phaseAdvanced]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    setLoading(true);
    const tempId = 'opt-' + Date.now();
    setMessages(prev => [...prev, { id: tempId, role:'user', content: text, phase: currentPhase, created_at: new Date().toISOString() }]);
    try {
      const result = await sendMessage(node.id, text);
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id:'u-'+Date.now(), role:'user',      content: text,           phase: currentPhase,  created_at: new Date().toISOString() },
        { id:'a-'+Date.now(), role:'assistant', content: result.message, phase: result.phase,  created_at: new Date().toISOString() },
      ]);
      if (result.phase_advanced) { setCurrentPhase(result.phase); setPhaseAdvanced(true); }
      if (result.phase === 'confirm' && !showSpawn) setShowSpawn(true);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessages(prev => [...prev, { id:'err-'+Date.now(), role:'assistant', content:'Something went wrong. Please try again.', phase: currentPhase, created_at: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleSpawn(title) {
    try {
      const result = await createNode({ title, parent_id: node.id, edge_type: 'discovered_from' });
      setShowSpawn(false);
      onNodeSpawned(result.node);
    } catch (err) { console.error('Spawn failed:', err); }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#0a0a0f', display:'flex',
      flexDirection:'column', zIndex:300 }}>
      <style>{`
        @keyframes bounce {
          0%,60%,100% { transform:translateY(0); }
          30%          { transform:translateY(-6px); }
        }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#2a2a3e; border-radius:2px; }
      `}</style>

      {/* Header */}
      <div style={{ padding:'16px 24px', borderBottom:'1px solid #1e1e2e',
        display:'flex', alignItems:'center', gap:'16px', flexShrink:0 }}>
        <button onClick={onClose} style={{ background:'none', border:'1px solid #2a2a3e',
          borderRadius:'6px', color:'#6b7280', cursor:'pointer', padding:'6px 10px', fontSize:'13px' }}>
          ← Graph
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:'16px', fontWeight:'600', color:'#f0f0f8' }}>{node.title}</div>
          {provider && <div style={{ fontSize:'11px', color:'#3a3a4e', marginTop:'2px' }}>
            {provider.provider} · {provider.model}
          </div>}
        </div>
        <PhaseIndicator phase={currentPhase} phaseAdvanced={phaseAdvanced} />
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px', display:'flex', flexDirection:'column' }}>
        {loadingHistory ? (
          <div style={{ color:'#3a3a4e', fontSize:'13px', textAlign:'center', marginTop:'40px' }}>
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:'12px', color:'#3a3a4e' }}>
            <div style={{ fontSize:'32px' }}>◎</div>
            <div style={{ fontSize:'14px' }}>
              Begin exploring <span style={{ color:'#6b7280' }}>{node.title}</span>
            </div>
            <div style={{ fontSize:'12px', maxWidth:'320px', textAlign:'center', lineHeight:1.6, color:'#3a3a4e' }}>
              The guide asks questions. You build the understanding.
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            {showSpawn && <SpawnSuggestion onSpawn={handleSpawn} onDismiss={() => setShowSpawn(false)} />}
          </>
        )}
        {loading && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#1e1e2e',
              border:'1px solid #2a2a3e', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'12px', color:'#f59e0b', flexShrink:0 }}>n</div>
            <div style={{ padding:'10px 14px', background:'#1a1a2e', border:'1px solid #2a2a3e',
              borderRadius:'12px 12px 12px 2px', display:'flex', gap:'4px', alignItems:'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#3a3a5e',
                  animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:'16px 24px', borderTop:'1px solid #1e1e2e', display:'flex', gap:'10px', flexShrink:0 }}>
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Share what you think, ask what you wonder..."
          rows={2}
          style={{ flex:1, background:'#12121a', border:'1px solid #2a2a3e', borderRadius:'8px',
            padding:'10px 14px', color:'#e8e8f0', fontSize:'14px', outline:'none',
            resize:'none', fontFamily:'inherit', lineHeight:'1.5' }} />
        <button onClick={handleSend} disabled={!input.trim() || loading}
          style={{ padding:'0 20px', background: input.trim() && !loading ? '#f59e0b' : '#1e1e2e',
            color: input.trim() && !loading ? '#0a0a0f' : '#3a3a4e', border:'none', borderRadius:'8px',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', fontSize:'18px', flexShrink:0 }}>
          ↑
        </button>
      </div>
    </div>
  );
}