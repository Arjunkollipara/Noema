const { QdrantClient } = require('@qdrant/js-client-rest');
const pool = require('../../db/pool');
const { v4: uuidv4 } = require('uuid');

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://qdrant:6333',
});

const COLLECTION = 'noema_traces';
const VECTOR_SIZE = 1536;

async function ensureCollection() {
  try {
    await qdrant.getCollection(COLLECTION);
  } catch {
    await qdrant.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
    });
  }
  console.log('[memory] collection exists or created');
}

function textToVector(text, size) {
  const vector = new Array(size).fill(0);
  const normalized = text.toLowerCase().trim();
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const pos = (code * (i + 1)) % size;
    vector[pos] += Math.sin(code * 0.1) * 0.1;
    vector[(pos + 1) % size] += Math.cos(code * 0.1) * 0.1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
}

async function embedText(text) {
  return textToVector(text, VECTOR_SIZE);
}

async function storeTrace({ nodeId, userId, content, phase }) {
  const traceId = uuidv4();
  await pool.query(
    'INSERT INTO understanding_traces (id, node_id, user_id, content, captured_at) VALUES (?, ?, ?, ?, NOW())',
    [traceId, nodeId, userId, content]
  );
  const [nodes] = await pool.query('SELECT title FROM nodes WHERE id = ?', [nodeId]);
  const title = nodes[0]?.title || '';
  const vector = await embedText(content);
  await qdrant.upsert(COLLECTION, {
    points: [{
      id: traceId,
      vector,
      payload: {
        node_id: nodeId,
        user_id: userId,
        node_title: title,
        phase,
        content: content.slice(0, 500),
        captured_at: new Date().toISOString(),
      },
    }],
  });
  console.log(`[memory] stored trace for node "${title}" phase:${phase}`);
  return traceId;
}

async function findSimilarNodes({ userId, text, excludeNodeId, limit = 3 }) {
  try {
    const vector = await embedText(text);
    const results = await qdrant.search(COLLECTION, {
      vector,
      limit: limit + 1,
      filter: {
        must: [{ key: 'user_id', match: { value: userId } }],
      },
      with_payload: true,
    });
    return results
      .filter(r => r.payload.node_id !== excludeNodeId)
      .slice(0, limit)
      .map(r => ({
        node_id: r.payload.node_id,
        node_title: r.payload.node_title,
        content: r.payload.content,
        phase: r.payload.phase,
        score: r.score,
      }));
  } catch (err) {
    console.error('[memory] search error:', err.message);
    return [];
  }
}

module.exports = { ensureCollection, storeTrace, findSimilarNodes };
