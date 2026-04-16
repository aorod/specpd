import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const db = new Database(process.env.DATABASE_PATH || join(__dirname, 'data.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Migrations – add columns to existing tables when the DB was created before them
for (const sql of [
  `ALTER TABLE ferias ADD COLUMN status       TEXT    DEFAULT 'Em Aprovação Gestor'`,
  `ALTER TABLE ferias ADD COLUMN venda_ferias INTEGER DEFAULT 0`,
  `ALTER TABLE ferias ADD COLUMN antecipar_13 INTEGER DEFAULT 0`,
]) {
  try { db.exec(sql); } catch { /* column already exists */ }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS work_items (
    id            TEXT PRIMARY KEY,
    work_item_type TEXT,
    title          TEXT,
    assigned_to    TEXT,
    state          TEXT,
    sub_status     TEXT,
    requisito      TEXT,
    mes            TEXT,
    ano            TEXT,
    designer       TEXT,
    produto        TEXT,
    tags           TEXT,
    atividade      TEXT,
    equipe         TEXT,
    effort         REAL
  );

  CREATE TABLE IF NOT EXISTS sync_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    synced_at   TEXT DEFAULT (datetime('now')),
    items_count INTEGER,
    status      TEXT,
    message     TEXT
  );

  CREATE TABLE IF NOT EXISTS day_offs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    analista    TEXT NOT NULL,
    equipe      TEXT,
    data_inicio TEXT NOT NULL,
    data_fim    TEXT NOT NULL,
    tipo_abono  TEXT NOT NULL,
    criado_em   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ferias (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    analista     TEXT NOT NULL,
    equipe       TEXT,
    data_inicio  TEXT NOT NULL,
    data_fim     TEXT NOT NULL,
    tipo         TEXT NOT NULL,
    observacao   TEXT,
    status       TEXT DEFAULT 'Em Aprovação Gestor',
    venda_ferias INTEGER DEFAULT 0,
    antecipar_13 INTEGER DEFAULT 0,
    criado_em    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    data      TEXT NOT NULL,
    titulo    TEXT NOT NULL,
    tipo      TEXT NOT NULL,
    descricao TEXT,
    criado_em TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nome       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    senha_hash TEXT    NOT NULL,
    papel      TEXT    NOT NULL DEFAULT 'viewer',
    ativo      INTEGER NOT NULL DEFAULT 1,
    criado_em  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL UNIQUE,
    visible_cards   TEXT    NOT NULL DEFAULT '["Backlog","Desenvolver/Entregar","Em teste","Concluído"]',
    atualizado_em   TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ── Conversões row ↔ item ─────────────────────────────────────────────────────

export function rowToItem(row) {
  return {
    id:           row.id,
    workItemType: row.work_item_type,
    title:        row.title,
    assignedTo:   row.assigned_to,
    state:        row.state,
    subStatus:    row.sub_status,
    requisito:    row.requisito,
    mes:          row.mes,
    ano:          row.ano,
    designer:     row.designer,
    produto:      row.produto,
    tags:         row.tags,
    atividade:    row.atividade,
    equipe:       row.equipe,
    effort:       row.effort,
  };
}

function itemToRow(item) {
  return {
    id:             item.id,
    work_item_type: item.workItemType,
    title:          item.title,
    assigned_to:    item.assignedTo,
    state:          item.state,
    sub_status:     item.subStatus,
    requisito:      item.requisito,
    mes:            item.mes,
    ano:            item.ano,
    designer:       item.designer,
    produto:        item.produto,
    tags:           item.tags,
    atividade:      item.atividade,
    equipe:         item.equipe,
    effort:         item.effort ?? null,
  };
}

// ── Operações de cache ────────────────────────────────────────────────────────

const CACHE_TTL_MS = (parseInt(process.env.CACHE_TTL_MINUTES) || 30) * 60 * 1000;

export function isCacheValid() {
  const row = db
    .prepare("SELECT synced_at FROM sync_log WHERE status = 'success' ORDER BY id DESC LIMIT 1")
    .get();
  if (!row) return false;
  return Date.now() - new Date(row.synced_at + 'Z').getTime() < CACHE_TTL_MS;
}

export function getCachedItems() {
  return db.prepare('SELECT * FROM work_items').all().map(rowToItem);
}

const stmtInsert = db.prepare(`
  INSERT OR REPLACE INTO work_items
    (id, work_item_type, title, assigned_to, state, sub_status,
     requisito, mes, ano, designer, produto, tags, atividade, equipe, effort)
  VALUES
    (@id, @work_item_type, @title, @assigned_to, @state, @sub_status,
     @requisito, @mes, @ano, @designer, @produto, @tags, @atividade, @equipe, @effort)
`);

const replaceAll = db.transaction((items) => {
  db.prepare('DELETE FROM work_items').run();
  for (const item of items) stmtInsert.run(itemToRow(item));
});

export function saveItems(items) {
  replaceAll(items);
}

export function logSync(status, itemsCount, message = null) {
  db.prepare('INSERT INTO sync_log (status, items_count, message) VALUES (?, ?, ?)').run(
    status,
    itemsCount,
    message,
  );
}

export function getLastSync() {
  return db.prepare('SELECT * FROM sync_log ORDER BY id DESC LIMIT 1').get() ?? null;
}

export function getItemCount() {
  return db.prepare('SELECT COUNT(*) AS count FROM work_items').get().count;
}

export function getCacheTTLMinutes() {
  return CACHE_TTL_MS / 60_000;
}

// ── Operações de usuário ──────────────────────────────────────────────────────
// Estas funções formam a camada de acesso a dados de usuários.
// Para migrar para um banco de dados externo (online), basta criar um novo
// módulo (ex.: cloudUserRepository.js) com as mesmas assinaturas e substituir
// os imports nos arquivos de rota.

export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) ?? null;
}

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) ?? null;
}

export function listUsers() {
  return db.prepare(
    'SELECT id, nome, email, papel, ativo, criado_em FROM users ORDER BY nome COLLATE NOCASE',
  ).all();
}

export function getUserCount() {
  return db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
}

export function createUser({ nome, email, senhaHash, papel = 'viewer' }) {
  const result = db
    .prepare('INSERT INTO users (nome, email, senha_hash, papel) VALUES (?, ?, ?, ?)')
    .run(nome, email, senhaHash, papel);
  return result.lastInsertRowid;
}

export function updateUser(id, { nome, email, senhaHash, papel, ativo }) {
  db.prepare(
    'UPDATE users SET nome=?, email=?, senha_hash=?, papel=?, ativo=? WHERE id=?',
  ).run(nome, email, senhaHash, papel, ativo, id);
}

export function deleteUser(id) {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

// ── Preferências por usuário ───────────────────────────────────────────────────

export function getUserPreferences(userId) {
  return db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) ?? null;
}

export function upsertUserPreferences(userId, visibleCards) {
  db.prepare(`
    INSERT INTO user_preferences (user_id, visible_cards, atualizado_em)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      visible_cards = excluded.visible_cards,
      atualizado_em = excluded.atualizado_em
  `).run(userId, JSON.stringify(visibleCards));
}

export default db;
