ALTER TABLE nodes
  ADD COLUMN cognitive_stage TINYINT(1) DEFAULT 1,
  ADD COLUMN stage_updated_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE messages
  ADD COLUMN cognitive_stage TINYINT(1) DEFAULT 1;

CREATE INDEX idx_nodes_cognitive_stage ON nodes(user_id, cognitive_stage);
