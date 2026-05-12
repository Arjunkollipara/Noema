-- SPRINT 1: Persistent Conceptual Continuity (MVI State)
-- Purpose: Adds the infrastructure for the Concept Synthesizer to store evolving summaries.

ALTER TABLE nodes
  -- mvi_state: Holds the JSON representation of the user's current understanding.
  -- Format: { current_summary: string, frontier: string[], lexicon: string[], version: int }
  ADD COLUMN mvi_state JSON DEFAULT NULL,

  -- last_synthesized_at: Timestamp of the most recent successful synthesis run.
  -- Used to calculate the "staleness" of the concept.
  ADD COLUMN last_synthesized_at TIMESTAMP NULL DEFAULT NULL,

  -- needs_synthesis: A binary flag (1 = dirty, 0 = clean).
  -- Set by the chat route after new messages are recorded.
  ADD COLUMN needs_synthesis TINYINT(1) DEFAULT 0;

-- idx_nodes_synthesis: Optimizes the background worker's selection process.
-- Allows the synthesizer to efficiently find dirty nodes that have been idle.
CREATE INDEX idx_nodes_synthesis ON nodes(needs_synthesis, last_visited);

/*
  ROLLBACK STRATEGY:
  
  DROP INDEX idx_nodes_synthesis ON nodes;
  ALTER TABLE nodes 
    DROP COLUMN mvi_state,
    DROP COLUMN last_synthesized_at,
    DROP COLUMN needs_synthesis;
*/
