CREATE TABLE IF NOT EXISTS global_messages (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  nodes_updated JSON DEFAULT NULL,
  nodes_created JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_global_messages_user (user_id),
  INDEX idx_global_messages_created (user_id, created_at)
);
