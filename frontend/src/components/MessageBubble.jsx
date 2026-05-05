export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div style={{ display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom:'12px' }}>
      {!isUser && (
        <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#1e1e2e',
          border:'1px solid #2a2a3e', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'12px', color:'#f59e0b', marginRight:'8px', flexShrink:0, marginTop:'2px' }}>
          n
        </div>
      )}
      <div style={{
        maxWidth:'75%', padding:'10px 14px',
        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        background: isUser ? '#1e3a5f' : '#1a1a2e',
        border: isUser ? '1px solid #2a4a7f' : '1px solid #2a2a3e',
        fontSize:'14px', lineHeight:'1.6',
        color: isUser ? '#bfdbfe' : '#e8e8f0',
        whiteSpace:'pre-wrap', wordBreak:'break-word',
      }}>
        {message.content}
      </div>
    </div>
  );
}