CREATE TABLE IF NOT EXISTS association_signals (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  node_id VARCHAR(36) DEFAULT NULL,
  message_id VARCHAR(36) DEFAULT NULL,
  emotional_tone ENUM('curious','frustrated','excited','lost','confident','neutral') DEFAULT 'neutral',
  moment_type ENUM('confusion','building','clicking','consolidating') DEFAULT 'building',
  activated_concepts JSON DEFAULT NULL,
  raw_message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_signals_user (user_id),
  INDEX idx_signals_tone (user_id, emotional_tone),
  INDEX idx_signals_moment (user_id, moment_type),
  INDEX idx_signals_created (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS learner_profile (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  dominant_tone JSON DEFAULT NULL,
  dominant_moment_pattern JSON DEFAULT NULL,
  thinking_style JSON DEFAULT NULL,
  confusion_signals JSON DEFAULT NULL,
  click_patterns JSON DEFAULT NULL,
  total_messages_analyzed INT DEFAULT 0,
  last_analyzed_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
