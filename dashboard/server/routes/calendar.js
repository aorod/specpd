import { Router } from 'express';
import db from '../db.js';

const router = Router();

function toItem(row) {
  return {
    id:        row.id,
    data:      row.data,
    titulo:    row.titulo,
    tipo:      row.tipo,
    descricao: row.descricao,
    criadoEm:  row.criado_em,
  };
}

// GET /api/calendar/events?ano=2026
router.get('/events', (req, res) => {
  const { ano } = req.query;
  const rows = ano
    ? db.prepare("SELECT * FROM calendar_events WHERE strftime('%Y', data) = ? ORDER BY data").all(String(ano))
    : db.prepare('SELECT * FROM calendar_events ORDER BY data').all();
  res.json(rows.map(toItem));
});

// POST /api/calendar/events
router.post('/events', (req, res) => {
  const { data, titulo, tipo, descricao } = req.body;
  if (!data || !titulo || !tipo) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }
  const result = db.prepare(
    'INSERT INTO calendar_events (data, titulo, tipo, descricao) VALUES (?, ?, ?, ?)',
  ).run(data, titulo, tipo, descricao ?? null);
  const row = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(toItem(row));
});

// PUT /api/calendar/events/:id
router.put('/events/:id', (req, res) => {
  const { data, titulo, tipo, descricao } = req.body;
  const { id } = req.params;
  if (!data || !titulo || !tipo) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }
  const result = db.prepare(
    'UPDATE calendar_events SET data=?, titulo=?, tipo=?, descricao=? WHERE id=?',
  ).run(data, titulo, tipo, descricao ?? null, id);
  if (!result.changes) return res.status(404).json({ error: 'Evento não encontrado' });
  const row = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
  res.json(toItem(row));
});

// DELETE /api/calendar/events/:id
router.delete('/events/:id', (req, res) => {
  const result = db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json({ ok: true });
});

export default router;
