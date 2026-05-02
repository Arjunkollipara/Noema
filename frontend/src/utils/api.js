const BASE = '/api';

export async function fetchNodes() {
  const res = await fetch(`${BASE}/graph/nodes`);
  if (!res.ok) throw new Error('Failed to fetch nodes');
  return res.json();
}

export async function fetchEdges() {
  const res = await fetch(`${BASE}/graph/edges`);
  if (!res.ok) throw new Error('Failed to fetch edges');
  return res.json();
}

export async function createNode({ title, summary, parent_id, edge_type }) {
  const res = await fetch(`${BASE}/graph/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, summary, parent_id, edge_type }),
  });
  if (!res.ok) throw new Error('Failed to create node');
  return res.json();
}

export async function deleteNode(id) {
  const res = await fetch(`${BASE}/graph/nodes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete node');
  return res.json();
}
