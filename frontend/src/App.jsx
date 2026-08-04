import { useCallback, useEffect, useState } from 'react';
import Graph from './components/Graph';
import NodeInfo from './components/NodeInfo';
import CreateNodeModal from './components/CreateNodeModal';
import ChatPanel from './components/ChatPanel';
import GlobalChat from './components/GlobalChat';
import AuthScreen from './components/AuthScreen';
import HUD from './components/HUD';
import { fetchNodes, fetchEdges, createNode, deleteNode, anchorNode } from './utils/api';

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [chatNode, setChatNode] = useState(null);
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadGraph = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nodesData, edgesData] = await Promise.all([fetchNodes(), fetchEdges()]);
      setNodes(nodesData.nodes || []);
      setEdges(edgesData.edges || []);
    } catch (err) {
      setError(err.message || 'Failed to connect to the knowledge engine.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (mounted && data) setUser(data);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setCheckingAuth(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) loadGraph();
  }, [user, loadGraph]);

  const handleNodeClick = useCallback(node => {
    setSelectedNode(node);
  }, []);

  function handleClosePanel() {
    setSelectedNode(null);
  }

  function handleOpenGlobalChat() {
    setShowGlobalChat(true);
  }

  function handleCloseGlobalChat() {
    setShowGlobalChat(false);
    loadGraph();
  }

  function handleGraphUpdate() {
    loadGraph();
  }

  async function handleDeleteNode(id) {
    try {
      await deleteNode(id);
      setSelectedNode(null);
      await loadGraph();
    } catch (err) {
      setError(err.message || 'Failed to delete node.');
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
      setError(err.message || 'Failed to create node.');
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setUser(null);
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setChatNode(null);
    setShowGlobalChat(false);
  }

  async function handleEnterChat(node) {
    if (node.is_anchored === 0) {
      try {
        await anchorNode(node.id);
        await loadGraph();
      } catch (err) {
        setError(err.message || 'Failed to anchor node.');
      }
    }
    setSelectedNode(null);
    setChatNode(node);
  }

  function handleCloseChat() {
    setChatNode(null);
    loadGraph();
  }

  async function handleNodeSpawned() {
    setChatNode(null);
    await loadGraph();
  }

  if (checkingAuth) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#060608',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#1e1e2e',
        fontSize: '13px',
        letterSpacing: '0.05em',
      }}>
        ⦿
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuth={setUser} />;
  }

  if (error) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#060608',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ef4444',
        fontSize: '13px',
        padding: '40px',
        textAlign: 'center',
      }}>
        <div>
          <div style={{ marginBottom: '14px' }}>{error}</div>
          <button
            onClick={loadGraph}
            style={{
              background: 'none',
              border: '1px solid #1e1e2e',
              color: '#f59e0b',
              padding: '8px 14px',
              borderRadius: '20px',
              cursor: 'pointer',
            }}
          >
            retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Graph
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        selectedNodeId={selectedNode?.id}
      />

      {!chatNode && !showGlobalChat && (
        <HUD
          nodeCount={nodes.filter(n => n.is_anchored === 1).length}
          onThink={() => setShowGlobalChat(true)}
          onNewNode={() => setShowCreateModal(true)}
          onLogout={handleLogout}
        />
      )}

      {selectedNode && !chatNode && !showGlobalChat && (
        <NodeInfo
          node={selectedNode}
          onEnterChat={handleEnterChat}
          onDelete={handleDeleteNode}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {showCreateModal && (
        <CreateNodeModal
          onConfirm={handleCreateNode}
          onCancel={() => setShowCreateModal(false)}
          parentNode={selectedNode}
        />
      )}

      {chatNode && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '420px',
          background: '#0a0a0f',
          borderLeft: '1px solid #1e1e2e',
          zIndex: 300,
          boxShadow: '-12px 0 48px rgba(0, 0, 0, 0.35)',
          animation: 'slideInRight 0.25s ease',
        }}>
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to   { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          <ChatPanel
            node={chatNode}
            onClose={handleCloseChat}
            onNodeSpawned={handleNodeSpawned}
          />
        </div>
      )}

      {showGlobalChat && (
        <GlobalChat
          onGraphUpdate={handleGraphUpdate}
          onClose={handleCloseGlobalChat}
        />
      )}
    </div>
  );
}
