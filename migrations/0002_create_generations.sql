-- Migration: Create generations table
CREATE TABLE IF NOT EXISTS generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  prompt TEXT NOT NULL,
  generated_output TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_generations_slug ON generations(slug);
CREATE INDEX IF NOT EXISTS idx_generations_email ON generations(email);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at);

