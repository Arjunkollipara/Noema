CREATE TABLE IF NOT EXISTS nodes (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  phase ENUM('explore', 'construct', 'confirm') DEFAULT 'explore',
  decay_score FLOAT DEFAULT 1.0,
  visit_count INT DEFAULT 0,
  last_visited TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_nodes_user_id (user_id),
  INDEX idx_nodes_decay_score (decay_score),
  INDEX idx_nodes_last_visited (last_visited)
);
