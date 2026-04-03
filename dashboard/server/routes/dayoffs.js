import { Router } from 'express';
import db from '../db.js';

const router = Router();

function toItem(row) {
  return {
    id:         row.id,
    analista:   row.analista,
    equipe:     row.equipe,
    dataInicio: row.data_inicio,
    dataFim:    row.data_fim,
    tipoAbono:  row.tipo_abono,
    criadoEm:   row.criado_em,
  };
}

// GET /api/dayoffs
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM day_offs ORDER BY data_inicio DESC, id DESC').all();
  res.json(rows.map(toItem));
});

// POST /api/dayoffs
router.post('/', (req, res) => {
  const { analista, equipe, dataInicio, dataFim, tipoAbono } = req.body;
  if (!analista || !dataInicio || !dataFim || !tipoAbono) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }
  const result = db.prepare(
    'INSERT INTO day_offs (analista, equipe, data_inicio, data_fim, tipo_abono) VALUES (?, ?, ?, ?, ?)',
  ).run(analista, equipe ?? '', dataInicio, dataFim, tipoAbono);
  const row = db.prepare('SELECT * FROM day_offs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(toItem(row));
});

// PUT /api/dayoffs/:id
router.put('/:id', (req, res) => {
  const { analista, equipe, dataInicio, dataFim, tipoAbono } = req.body;
  const { id } = req.params;
  if (!analista || !dataInicio || !dataFim || !tipoAbono) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }
  const result = db.prepare(
    'UPDATE day_offs SET analista=?, equipe=?, data_inicio=?, data_fim=?, tipo_abono=? WHERE id=?',
  ).run(analista, equipe ?? '', dataInicio, dataFim, tipoAbono, id);
  if (!result.changes) return res.status(404).json({ error: 'Registro não encontrado' });
  const row = db.prepare('SELECT * FROM day_offs WHERE id = ?').get(id);
  res.json(toItem(row));
});

// DELETE /api/dayoffs/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM day_offs WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json({ ok: true });
});

export default router;
