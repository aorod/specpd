import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const db = new Database(join(__dirname, 'data.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    analista    TEXT NOT NULL,
    equipe      TEXT,
    data_inicio TEXT NOT NULL,
    data_fim    TEXT NOT NULL,
    tipo        TEXT NOT NULL,
    observacao  TEXT,
    criado_em   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    data      TEXT NOT NULL,
    titulo    TEXT NOT NULL,
    tipo      TEXT NOT NULL,
    descricao TEXT,
    criado_em TEXT DEFAULT (datetime('now'))
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

export default db;
