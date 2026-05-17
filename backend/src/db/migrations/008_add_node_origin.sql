ALTER TABLE nodes
  ADD COLUMN node_origin ENUM('explicit', 'implicit', 'expected', 'blocking')
    DEFAULT 'explicit',
  ADD COLUMN is_anchored TINYINT(1) DEFAULT 1,
  ADD COLUMN anchor_confidence FLOAT DEFAULT NULL,
  ADD COLUMN inferred_from_node_id VARCHAR(36) DEFAULT NULL,
  ADD COLUMN rejected TINYINT(1) DEFAULT 0;

CREATE INDEX idx_nodes_origin ON nodes(user_id, node_origin, is_anchored);

-- All existing nodes are explicit and anchored
UPDATE nodes
SET node_origin = 'explicit',
    is_anchored = 1
WHERE node_origin IS NULL OR node_origin = 'explicit';
