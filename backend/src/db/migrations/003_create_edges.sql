CREATE TABLE IF NOT EXISTS edges (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  source_id VARCHAR(36) NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  edge_type ENUM('discovered_from', 'contradicts', 'supports', 'prerequisite_of', 'analogous_to') DEFAULT 'discovered_from',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE,
  INDEX idx_edges_user_id (user_id),
  INDEX idx_edges_source_id (source_id),
  INDEX idx_edges_target_id (target_id)
);
