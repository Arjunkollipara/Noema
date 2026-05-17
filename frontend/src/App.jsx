import { useState, useEffect, useCallback } from 'react';
import Graph from './components/Graph';
import NodePanel from './components/NodePanel';
import CreateNodeModal from './components/CreateNodeModal';
import ChatPanel from './components/ChatPanel';
import AuthScreen from './components/AuthScreen';
import { fetchNodes, fetchEdges, createNode, deleteNode, anchorNode } from './utils/api';

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false); // Initialized to false to prevent hang before auth
  const [error, setError] = useState(null);
  const [chatNode, setChatNode] = useState(null);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  /**
   * Loads graph data from the backend.
   * Ensures loading state resolves even on failure.
   */
  const loadGraph = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch nodes and edges in parallel
      const [nodesData, edgesData] = await Promise.all([
        fetchNodes(),
        fetchEdges()
      ]);

      // Ensure we have arrays even if backend returns null/undefined
      setNodes(nodesData?.nodes || []);
      setEdges(edgesData?.edges || []);
    } catch (err) {
      console.error('[App] Failed to load graph:', err);
      setError(err.message || 'Failed to connect to the knowledge engine.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth check on mount
  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { 
        if (mounted && data) setUser(data); 
      })
      .catch(err => {
        console.error('[App] Auth check failed:', err);
      })
      .finally(() => {
        if (mounted) setCheckingAuth(false);
      });
    return () => { mounted = false; };
  }, []);

  // Load graph when user is authenticated
  useEffect(() => { 
    if (user) loadGraph(); 
  }, [user, loadGraph]);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  function handleClosePanel() {
    setSelectedNode(null);
  }

  async function handleDeleteNode(id) {
    try {
      await deleteNode(id);
      setSelectedNode(null);
      await loadGraph();
    } catch (err) {
      alert('Failed to delete node: ' + err.message);
    }
  }

  async function handleCreateNode({ title, summary }) {
    try {
      const parentId = selectedNode ? selectedNode.id : undefined;
      await createNode({
        title,
        summary,
        parent_id: parentId,
        edge_type: parentId ? 'discovered_from' : undefined,
      });
      setShowCreateModal(false);
      await loadGraph();
    } catch (err) {
      alert('Failed to create node: ' + err.message);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    setUser(null);
    setNodes([]);
    setEdges([]);
    setError(null);
  }

  async function handleEnterChat(node) {
    if (node.is_anchored === 0) {
      try {
        await anchorNode(node.id);
        await loadGraph();
      } catch (err) {
        console.error('Failed to anchor node:', err);
      }
    }
    setChatNode(node);
  }
  function handleCloseChat() { setChatNode(null); loadGraph(); }
  async function handleNodeSpawned(newNode) { setChatNode(null); await loadGraph(); }

  // 1. Auth Checking State
  if (checkingAuth) return (
    <div id="boot-loader" style={{ 
      width:'100vw', height:'100vh', background:'#0a0a0f',
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'#3a3a4e', fontSize:'14px' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '12px', fontSize: '24px' }}>◎</div>
        Connecting...
      </div>
    </div>
  );

  // 2. Not Authenticated State
  if (!user) return <AuthScreen onAuth={setUser} />;

  // 3. Loading State (only after auth)
  if (loading && nodes.length === 0) return (
    <div id="graph-loader" style={{
      width: '100vw', height: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0f', color: '#6b7280', fontSize: '14px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '12px' }} className="pulse">Synthesizing your knowledge graph...</div>
        <style>{`
          .pulse { animation: pulse 1.5s infinite ease-in-out; }
          @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
        `}</style>
      </div>
    </div>
  );

  // 4. Error State
  if (error) return (
    <div id="error-screen" style={{
      width: '100vw', height: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0f', color: '#6b7280', fontSize: '14px',
      padding: '40px', textAlign: 'center'
    }}>
      <div>
        <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '16px' }}>Connection Error</div>
        <div style={{ marginBottom: '24px', maxWidth: '400px' }}>{error}</div>
        <button onClick={loadGraph} style={{
          padding: '8px 24px', background: '#1e1e2e', border: '1px solid #2a2a3e',
          borderRadius: '8px', color: '#f0f0f8', cursor: 'pointer'
        }}>
          Retry Connection
        </button>
      </div>
    </div>
  );

  // 5. Empty Graph State
  if (!loading && nodes.length === 0) return (
    <div id="empty-state" style={{ 
      width: '100vw', height: '100vh', background: '#0a0a0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
       {/* Re-using Top Bar for branding/logout */}
       <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, padding: '16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 50,
      }}>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#f0f0f8' }}>noema</div>
        <button onClick={handleLogout} style={{
          padding: '8px 12px', background: 'none', border: '1px solid #2a2a3e',
          borderRadius: '8px', color: '#6b7280', fontSize: '13px', cursor: 'pointer'
        }}>Sign out</button>
      </div>

      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px', opacity: 0.5 }}>◎</div>
        <h1 style={{ color: '#f0f0f8', fontSize: '24px', marginBottom: '16px', fontWeight: '600' }}>
          Your Mind is a Blank Canvas
        </h1>
        <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
          Noema helps you map your understanding. Start by creating a central concept you want to explore.
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '12px 32px', background: '#f59e0b', border: 'none',
            borderRadius: '12px', color: '#0a0a0f', fontSize: '15px',
            fontWeight: '700', cursor: 'pointer', transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          Create First Concept
        </button>
      </div>

      {showCreateModal && (
        <CreateNodeModal
          onConfirm={handleCreateNode}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );

  // 6. Main Application UI
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* Graph canvas */}
      <Graph
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        selectedNodeId={selectedNode?.id}
      />

      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        padding: '16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(to bottom, rgba(10,10,15,0.9), transparent)',
        pointerEvents: 'none',
        zIndex: 50,
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#f0f0f8', letterSpacing: '0' }}>
            noema
          </span>
          <span style={{ fontSize: '12px', color: '#3a3a4e', marginLeft: '12px' }}>
            {nodes.length} {nodes.length === 1 ? 'concept' : 'concepts'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={handleLogout} style={{
            pointerEvents: 'auto',
            padding: '8px 12px',
            background: 'none',
            border: '1px solid #2a2a3e',
            borderRadius: '8px',
            color: '#6b7280',
            fontSize: '13px',
            cursor: 'pointer',
            marginRight: '8px',
          }}>
            Sign out
          </button>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            pointerEvents: 'auto',
            padding: '8px 16px',
            background: '#f59e0b',
            border: 'none',
            borderRadius: '8px',
            color: '#0a0a0f',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          + New Node
        </button>
        </div>
      </div>

      {/* Node panel */}
      {selectedNode && (
        <NodePanel
          node={selectedNode}
          onClose={handleClosePanel}
          onDelete={handleDeleteNode}
          onEnterChat={handleEnterChat}
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateNodeModal
          onConfirm={handleCreateNode}
          onCancel={() => setShowCreateModal(false)}
          parentNode={selectedNode}
        />
      )}

      {/* Chat panel */}
      {chatNode && (
        <ChatPanel
          node={chatNode}
          onClose={handleCloseChat}
          onNodeSpawned={handleNodeSpawned}
        />
      )}
    </div>
  );
}
