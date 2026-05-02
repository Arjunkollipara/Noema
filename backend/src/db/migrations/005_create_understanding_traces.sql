CREATE TABLE IF NOT EXISTS understanding_traces (
  id VARCHAR(36) PRIMARY KEY,
  node_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_traces_node_id (node_id),
  INDEX idx_traces_user_id (user_id)
);
