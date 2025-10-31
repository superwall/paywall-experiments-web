-- Migration: Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_email ON emails(email);
CREATE INDEX IF NOT EXISTS idx_slug ON emails(slug);
CREATE INDEX IF NOT EXISTS idx_created_at ON emails(created_at);

