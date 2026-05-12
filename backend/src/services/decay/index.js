const cron = require('node-cron');
const pool = require('../../db/pool');
const { buildSynthesisPrompt } = require('../llm/prompts');
const { getProvider } = require('../llm/provider');

function calculateDecayScore(lastVisited) {
  if (!lastVisited) return 0.1;
  const now = new Date();
  const days = (now - new Date(lastVisited)) / (1000 * 60 * 60 * 24);
  return Math.round(Math.exp(-0.05 * days) * 10000) / 10000;
}

async function runDecayUpdate() {
  console.log('[decay] running decay update...');
  try {
    const [nodes] = await pool.query(
      'SELECT id, last_visited FROM nodes'
    );

    let updated = 0;
    for (const node of nodes) {
      const score = calculateDecayScore(node.last_visited);
      await pool.query(
        'UPDATE nodes SET decay_score = ? WHERE id = ?',
        [score, node.id]
      );
      updated++;
    }

    console.log(`[decay] updated ${updated} nodes`);
    return { updated, timestamp: new Date().toISOString() };
  } catch (err) {
    console.error('[decay] error:', err.message);
    throw err;
  }
}

// SPRINT 1: CONCEPT SYNTHESIZER WORKER

let isSynthesisRunning = false;

async function runSynthesisBatch() {
  if (isSynthesisRunning) {
    console.log('[synthesizer] skipping batch, already running');
    return;
  }

  isSynthesisRunning = true;
  console.log('[synthesizer] checking for nodes requiring synthesis...');

  try {
    // 1. Find nodes that need synthesis and have been idle for at least 2 minutes
    const [nodes] = await pool.query(
      `SELECT * FROM nodes 
       WHERE needs_synthesis = 1 
       AND last_visited < DATE_SUB(NOW(), INTERVAL 2 MINUTE) 
       LIMIT 5`
    );

    if (nodes.length === 0) {
      console.log('[synthesizer] no idle nodes found requiring synthesis');
      isSynthesisRunning = false;
      return;
    }

    const { client, model } = getProvider();

    for (const node of nodes) {
      console.log(`[synthesizer] processing node: "${node.title}" (${node.id})`);

      try {
        // 2. Fetch last 20 messages for context
        const [messages] = await pool.query(
          'SELECT role, content FROM messages WHERE node_id = ? ORDER BY created_at DESC LIMIT 20',
          [node.id]
        );
        
        // Reverse so they are in chronological order
        const recentMessages = messages.reverse();

        // 3. Generate synthesis prompt
        const prompt = buildSynthesisPrompt({
          nodeTitle: node.title,
          currentState: node.mvi_state,
          recentMessages
        });

        // 4. Call LLM
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: "json_object" } // Using JSON mode if supported
        });

        const rawResult = response.choices[0].message.content.trim();
        
        // 5. Parse and Validate JSON
        let newState;
        try {
          newState = JSON.parse(rawResult);
        } catch (e) {
          console.error(`[synthesizer] failed to parse JSON for node ${node.id}:`, rawResult);
          continue; // Skip this node, keep needs_synthesis = 1 for retry
        }

        // 6. Persist new state and clear dirty flag
        await pool.query(
          `UPDATE nodes 
           SET mvi_state = ?, 
               needs_synthesis = 0, 
               last_synthesized_at = NOW() 
           WHERE id = ?`,
          [JSON.stringify(newState), node.id]
        );

        console.log(`[synthesizer] successfully updated state for: "${node.title}"`);
      } catch (err) {
        console.error(`[synthesizer] error processing node ${node.id}:`, err.message);
        // We leave needs_synthesis = 1 so it tries again in the next batch
      }
    }
  } catch (err) {
    console.error('[synthesizer] batch error:', err.message);
  } finally {
    isSynthesisRunning = false;
  }
}

function startDecayScheduler() {
  // 1. Decay Job: Runs every 24 hours at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[decay] scheduled run triggered');
    await runDecayUpdate();
  });
  console.log('[decay] scheduler started (daily at midnight)');

  // 2. SPRINT 1 Synthesizer Job: Runs every 60 seconds
  cron.schedule('* * * * *', async () => {
    await runSynthesisBatch();
  });
  console.log('[synthesizer] worker started (every 60 seconds)');
}

module.exports = { startDecayScheduler, runDecayUpdate, calculateDecayScore, runSynthesisBatch };