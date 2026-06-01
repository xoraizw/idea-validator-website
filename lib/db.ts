import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data.db');
const WASM_PATH = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

const g = global as unknown as { __db?: Database; __dbInit?: Promise<Database> };

async function getDb(): Promise<Database> {
  if (g.__db) return g.__db;
  if (!g.__dbInit) g.__dbInit = boot();
  return g.__dbInit;
}

async function boot(): Promise<Database> {
  const wasmBin = readFileSync(WASM_PATH);
  const SQL = await initSqlJs({ wasmBinary: wasmBin.buffer.slice(wasmBin.byteOffset, wasmBin.byteOffset + wasmBin.byteLength) as ArrayBuffer });
  const db = existsSync(DB_PATH)
    ? new SQL.Database(readFileSync(DB_PATH))
    : new SQL.Database();
  migrate(db);
  g.__db = db;
  return db;
}

function persist(db: Database) {
  writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function migrate(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS pages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      prompt      TEXT NOT NULL,
      html        TEXT NOT NULL,
      created_at  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    CREATE TABLE IF NOT EXISTS signups (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id     INTEGER NOT NULL REFERENCES pages(id),
      email       TEXT NOT NULL,
      created_at  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      UNIQUE(page_id, email)
    );
    CREATE TABLE IF NOT EXISTS section_views (
      page_id     INTEGER NOT NULL REFERENCES pages(id),
      section     TEXT NOT NULL,
      count       INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (page_id, section)
    );
  `);
  persist(db);
}

// ── helpers ────────────────────────────────────────────────────────────────

function all<T>(db: Database, sql: string, params: (string | number | null)[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as T);
  stmt.free();
  return rows;
}

function one<T>(db: Database, sql: string, params: (string | number | null)[] = []): T | undefined {
  return all<T>(db, sql, params)[0];
}

function run(db: Database, sql: string, params: (string | number | null)[] = []) {
  db.run(sql, params);
  persist(db);
}

// ── types ─────────────────────────────────────────────────────────────────

export type Page = {
  id: number;
  slug: string;
  name: string;
  prompt: string;
  html: string;
  created_at: string;
};

export type SectionView = { section: string; count: number };

export type PageWithStats = Page & { signups: number; sections: SectionView[] };

// ── public API ─────────────────────────────────────────────────────────────

export async function createPage(slug: string, name: string, prompt: string, html: string) {
  const db = await getDb();
  run(db, 'INSERT INTO pages (slug, name, prompt, html) VALUES (?, ?, ?, ?)', [slug, name, prompt, html]);
}

export async function getPageBySlug(slug: string): Promise<Page | undefined> {
  const db = await getDb();
  return one<Page>(db, 'SELECT * FROM pages WHERE slug = ?', [slug]);
}

export async function addSignup(pageId: number, email: string): Promise<'ok' | 'duplicate'> {
  const db = await getDb();
  try {
    run(db, 'INSERT INTO signups (page_id, email) VALUES (?, ?)', [pageId, email]);
    return 'ok';
  } catch {
    return 'duplicate';
  }
}

export async function trackSection(pageId: number, section: string) {
  const db = await getDb();
  run(
    db,
    `INSERT INTO section_views (page_id, section, count) VALUES (?, ?, 1)
     ON CONFLICT(page_id, section) DO UPDATE SET count = count + 1`,
    [pageId, section],
  );
}

export async function getSignupsByPage(pageId: number) {
  const db = await getDb();
  return all<{ email: string; created_at: string }>(
    db,
    'SELECT email, created_at FROM signups WHERE page_id = ? ORDER BY created_at DESC',
    [pageId],
  );
}

export async function getDashboardStats(): Promise<{
  totalPages: number;
  totalSignups: number;
  pages: PageWithStats[];
}> {
  const db = await getDb();

  const pages = all<Page>(db, 'SELECT * FROM pages ORDER BY created_at DESC');
  const { c: totalSignups } = one<{ c: number }>(db, 'SELECT COUNT(*) as c FROM signups') ?? { c: 0 };

  const pagesWithStats: PageWithStats[] = pages.map((p) => {
    const { c: signups } = one<{ c: number }>(
      db,
      'SELECT COUNT(*) as c FROM signups WHERE page_id = ?',
      [p.id],
    ) ?? { c: 0 };
    const sections = all<SectionView>(
      db,
      'SELECT section, count FROM section_views WHERE page_id = ? ORDER BY count DESC',
      [p.id],
    );
    return { ...p, signups, sections };
  });

  return { totalPages: pages.length, totalSignups, pages: pagesWithStats };
}
