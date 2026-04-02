/**
 * Dy 数据库建表 SQL（尽量对齐 Python SQLAlchemy models.py 字段）
 */
export const DY_SCHEMA_SQL = {
  sqlite: [
    `
CREATE TABLE IF NOT EXISTS account_cookies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT,
  account_id TEXT,
  cookies TEXT,
  nickname TEXT,
  avatar TEXT,
  uid TEXT,
  add_ts INTEGER,
  last_modify_ts INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_cookies_account_id ON account_cookies(account_id);
    `.trim(),
    `
CREATE TABLE IF NOT EXISTS douyin_aweme (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  sec_uid TEXT,
  short_user_id TEXT,
  user_unique_id TEXT,
  nickname TEXT,
  avatar TEXT,
  user_signature TEXT,
  ip_location TEXT,
  add_ts INTEGER,
  last_modify_ts INTEGER,
  aweme_id INTEGER,
  aweme_type TEXT,
  title TEXT,
  desc TEXT,
  create_time INTEGER,
  liked_count TEXT,
  comment_count TEXT,
  share_count TEXT,
  collected_count TEXT,
  aweme_url TEXT,
  cover_url TEXT,
  video_download_url TEXT,
  music_download_url TEXT,
  note_download_url TEXT,
  source_keyword TEXT DEFAULT '',
  is_exported INTEGER DEFAULT 0,
  phone TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_douyin_aweme_aweme_id ON douyin_aweme(aweme_id);
    `.trim(),
    `
CREATE TABLE IF NOT EXISTS douyin_aweme_comment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  sec_uid TEXT,
  short_user_id TEXT,
  user_unique_id TEXT,
  nickname TEXT,
  avatar TEXT,
  user_signature TEXT,
  ip_location TEXT,
  add_ts INTEGER,
  last_modify_ts INTEGER,
  comment_id INTEGER,
  aweme_id INTEGER,
  content TEXT,
  create_time INTEGER,
  sub_comment_count TEXT,
  parent_comment_id TEXT,
  like_count TEXT DEFAULT '0',
  pictures TEXT DEFAULT '',
  phone TEXT,
  is_exported INTEGER DEFAULT 0,
  is_crm INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_douyin_aweme_comment_aweme_id ON douyin_aweme_comment(aweme_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_douyin_aweme_comment_comment_id ON douyin_aweme_comment(comment_id);
    `.trim(),
    `
CREATE TABLE IF NOT EXISTS dy_creator (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  nickname TEXT,
  avatar TEXT,
  ip_location TEXT,
  add_ts INTEGER,
  last_modify_ts INTEGER,
  desc TEXT,
  gender TEXT,
  follows TEXT,
  fans TEXT,
  interaction TEXT,
  videos_count TEXT,
  phone TEXT,
  is_exported INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dy_creator_user_id ON dy_creator(user_id);
    `.trim(),
    `
CREATE TABLE IF NOT EXISTS task_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT,
  task_name TEXT,
  status TEXT,
  start_time INTEGER,
  end_time INTEGER,
  parameters TEXT,
  progress INTEGER DEFAULT 0,
  created_by TEXT,
  created_at INTEGER,
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 0,
  error TEXT,
  new_videos INTEGER DEFAULT 0,
  updated_videos INTEGER DEFAULT 0,
  new_comments INTEGER DEFAULT 0,
  updated_comments INTEGER DEFAULT 0,
  schedule_type TEXT,
  schedule_enabled INTEGER DEFAULT 0,
  schedule_at INTEGER,
  schedule_interval_ms INTEGER,
  schedule_next_run INTEGER,
  runs_count INTEGER DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_task_table_task_id ON task_table(task_id);
CREATE INDEX IF NOT EXISTS idx_task_table_status_created ON task_table(status, created_at);
CREATE INDEX IF NOT EXISTS idx_task_table_schedule ON task_table(schedule_enabled, schedule_next_run);
    `.trim(),
    `
CREATE TABLE IF NOT EXISTS task_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT,
  log_time INTEGER,
  level TEXT,
  message TEXT
);
CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id);
    `.trim(),
  ],
  mysql: [
    `
CREATE TABLE IF NOT EXISTS account_cookies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  platform VARCHAR(255),
  account_id VARCHAR(255),
  cookies TEXT,
  add_ts BIGINT,
  last_modify_ts BIGINT,
  UNIQUE KEY uk_account_cookies_account_id (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `.trim(),
    `
CREATE TABLE IF NOT EXISTS douyin_aweme (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255),
  sec_uid VARCHAR(255),
  short_user_id VARCHAR(255),
  user_unique_id VARCHAR(255),
  nickname TEXT,
  avatar TEXT,
  user_signature TEXT,
  ip_location TEXT,
  add_ts BIGINT,
  last_modify_ts BIGINT,
  aweme_id BIGINT,
  aweme_type TEXT,
  title TEXT,
  \`desc\` TEXT,
  create_time BIGINT,
  liked_count TEXT,
  comment_count TEXT,
  share_count TEXT,
  collected_count TEXT,
  aweme_url TEXT,
  cover_url TEXT,
  video_download_url TEXT,
  music_download_url TEXT,
  note_download_url TEXT,
  source_keyword TEXT,
  is_exported INT DEFAULT 0,
  phone TEXT,
  UNIQUE KEY uk_douyin_aweme_aweme_id (aweme_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `.trim(),
    `
CREATE TABLE IF NOT EXISTS douyin_aweme_comment (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255),
  sec_uid VARCHAR(255),
  short_user_id VARCHAR(255),
  user_unique_id VARCHAR(255),
  nickname TEXT,
  avatar TEXT,
  user_signature TEXT,
  ip_location TEXT,
  add_ts BIGINT,
  last_modify_ts BIGINT,
  comment_id BIGINT,
  aweme_id BIGINT,
  content TEXT,
  create_time BIGINT,
  sub_comment_count TEXT,
  parent_comment_id VARCHAR(255),
  like_count TEXT,
  pictures TEXT,
  phone TEXT,
  is_exported INT DEFAULT 0,
  is_crm INT DEFAULT 0,
  UNIQUE KEY uk_douyin_aweme_comment_comment_id (comment_id),
  KEY idx_douyin_aweme_comment_aweme_id (aweme_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `.trim(),
    `
CREATE TABLE IF NOT EXISTS dy_creator (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(255),
  nickname TEXT,
  avatar TEXT,
  ip_location TEXT,
  add_ts BIGINT,
  last_modify_ts BIGINT,
  \`desc\` TEXT,
  gender TEXT,
  follows TEXT,
  fans TEXT,
  interaction TEXT,
  videos_count VARCHAR(255),
  phone TEXT,
  is_exported INT DEFAULT 0,
  UNIQUE KEY uk_dy_creator_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `.trim(),
    `
CREATE TABLE IF NOT EXISTS task_table (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_id VARCHAR(64),
  task_name VARCHAR(255),
  status ENUM('pending','running','completed','failed','canceled','paused') DEFAULT 'pending',
  start_time BIGINT,
  end_time BIGINT,
  parameters JSON,
  progress INT DEFAULT 0,
  created_by VARCHAR(255),
  created_at BIGINT,
  priority INT DEFAULT 0,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 0,
  error TEXT,
  new_videos INT DEFAULT 0,
  updated_videos INT DEFAULT 0,
  new_comments INT DEFAULT 0,
  updated_comments INT DEFAULT 0,
  schedule_type VARCHAR(16),
  schedule_enabled TINYINT DEFAULT 0,
  schedule_at BIGINT,
  schedule_interval_ms BIGINT,
  schedule_next_run BIGINT,
  runs_count INT DEFAULT 0,
  UNIQUE KEY uk_task_table_task_id (task_id),
  KEY idx_task_table_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `.trim(),
    `
CREATE TABLE IF NOT EXISTS task_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_id VARCHAR(64),
  log_time BIGINT,
  level VARCHAR(16),
  message TEXT,
  KEY idx_task_logs_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `.trim(),
  ],
} as const;
