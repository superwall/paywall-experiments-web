import type { D1Database } from '@cloudflare/workers-types';

export interface EmailRecord {
  id?: number;
  email: string;
  slug: string;
  created_at?: string;
  user_agent?: string;
  ip_address?: string;
}

export interface GenerationRecord {
  id?: number;
  slug: string;
  prompt: string;
  generated_output: string;
  email?: string;
  created_at?: string;
  user_agent?: string;
  ip_address?: string;
}

export async function saveEmailToD1(
  db: D1Database,
  email: string,
  slug: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  await db.prepare(
    `INSERT INTO emails (email, slug, created_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(email, slug, timestamp, userAgent || null, ipAddress || null).run();
}

export async function getEmailsBySlug(
  db: D1Database,
  slug: string
): Promise<EmailRecord[]> {
  const result = await db.prepare(
    `SELECT * FROM emails WHERE slug = ? ORDER BY created_at DESC`
  ).bind(slug).all<EmailRecord>();
  
  return result.results || [];
}

export async function getEmailCount(db: D1Database): Promise<number> {
  const result = await db.prepare(
    `SELECT COUNT(*) as count FROM emails`
  ).first<{ count: number }>();
  
  return result?.count || 0;
}

export async function getAllEmails(
  db: D1Database,
  limit: number = 100,
  offset: number = 0
): Promise<EmailRecord[]> {
  const result = await db.prepare(
    `SELECT * FROM emails ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all<EmailRecord>();
  
  return result.results || [];
}

export async function saveGenerationToD1(
  db: D1Database,
  slug: string,
  prompt: string,
  generatedOutput: string,
  email?: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  await db.prepare(
    `INSERT INTO generations (slug, prompt, generated_output, email, created_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(slug, prompt, generatedOutput, email || null, timestamp, userAgent || null, ipAddress || null).run();
}

export async function getGenerationsBySlug(
  db: D1Database,
  slug: string
): Promise<GenerationRecord[]> {
  const result = await db.prepare(
    `SELECT * FROM generations WHERE slug = ? ORDER BY created_at DESC`
  ).bind(slug).all<GenerationRecord>();
  
  return result.results || [];
}

export async function getAllGenerations(
  db: D1Database,
  limit: number = 100,
  offset: number = 0
): Promise<GenerationRecord[]> {
  const result = await db.prepare(
    `SELECT * FROM generations ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all<GenerationRecord>();
  
  return result.results || [];
}

