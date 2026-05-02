import { useState, useEffect, useCallback } from 'react';
import Graph from './components/Graph';
import NodePanel from './components/NodePanel';
import CreateNodeModal from './components/CreateNodeModal';
import { fetchNodes, fetchEdges, createNode, deleteNode } from './utils/api';

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load graph data on mount
  async function loadGraph() {
    try {
      setLoading(true);
      const [nodesData, edgesData] = await Promise.all([fetchNodes(), fetchEdges()]);
      setNodes(nodesData.nodes);
      setEdges(edgesData.edges);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGraph(); }, []);

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

  function handleEnterChat(node) {
    // Sprint 5 will wire this to the chat panel
    alert(`Chat for "${node.title}" coming in Sprint 5`);
  }

  if (loading) return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0f', color: '#6b7280', fontSize: '14px',
    }}>
      Loading your knowledge graph...
    </div>
  );

  if (error) return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0f', color: '#ef4444', fontSize: '14px',
    }}>
      Error: {error}
    </div>
  );

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
    </div>
  );
}
