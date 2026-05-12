const BASE = '/api';

export async function fetchNodes() {
  const res = await fetch(`${BASE}/graph/nodes`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch nodes');
  return res.json();
}

export async function fetchEdges() {
  const res = await fetch(`${BASE}/graph/edges`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch edges');
  return res.json();
}

export async function createNode({ title, summary, parent_id, edge_type }) {
  const res = await fetch(`${BASE}/graph/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ title, summary, parent_id, edge_type }),
  });
  if (!res.ok) throw new Error('Failed to create node');
  return res.json();
}

export async function deleteNode(id) {
  const res = await fetch(`${BASE}/graph/nodes/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error('Failed to delete node');
  return res.json();
}

export async function fetchHistory(nodeId) {
  const res = await fetch(`/api/chat/${nodeId}/history`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function sendMessage(nodeId, message) {
  const res = await fetch(`/api/chat/${nodeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function fetchProvider() {
  const res = await fetch('/api/chat/provider', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch provider');
  return res.json();
}
