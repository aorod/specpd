import { Router } from 'express';
import db from '../db.js';

const router = Router();

function toItem(row) {
  return {
    id:          row.id,
    analista:    row.analista,
    equipe:      row.equipe,
    dataInicio:  row.data_inicio,
    dataFim:     row.data_fim,
    tipo:        row.tipo,
    observacao:  row.observacao,
    status:      row.status ?? 'Em Aprovação Gestor',
    vendaFerias: row.venda_ferias === 1,
    antecipar13: row.antecipar_13 === 1,
    criadoEm:    row.criado_em,
  };
}

// GET /api/ferias
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM ferias ORDER BY data_inicio DESC, id DESC').all();
  res.json(rows.map(toItem));
});

// POST /api/ferias
router.post('/', (req, res) => {
  const { analista, equipe, dataInicio, dataFim, tipo, observacao, status, vendaFerias, antecipar13 } = req.body;
  if (!analista || !dataInicio || !dataFim || !tipo) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }
  const result = db.prepare(
    'INSERT INTO ferias (analista, equipe, data_inicio, data_fim, tipo, observacao, status, venda_ferias, antecipar_13) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(analista, equipe ?? '', dataInicio, dataFim, tipo, observacao ?? null, status ?? 'Em Aprovação Gestor', vendaFerias ? 1 : 0, antecipar13 ? 1 : 0);
  const row = db.prepare('SELECT * FROM ferias WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(toItem(row));
});

// PUT /api/ferias/:id
router.put('/:id', (req, res) => {
  const { analista, equipe, dataInicio, dataFim, tipo, observacao, status, vendaFerias, antecipar13 } = req.body;
  const { id } = req.params;
  if (!analista || !dataInicio || !dataFim || !tipo) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }
  const result = db.prepare(
    'UPDATE ferias SET analista=?, equipe=?, data_inicio=?, data_fim=?, tipo=?, observacao=?, status=?, venda_ferias=?, antecipar_13=? WHERE id=?',
  ).run(analista, equipe ?? '', dataInicio, dataFim, tipo, observacao ?? null, status ?? 'Em Aprovação Gestor', vendaFerias ? 1 : 0, antecipar13 ? 1 : 0, id);
  if (!result.changes) return res.status(404).json({ error: 'Registro não encontrado' });
  const row = db.prepare('SELECT * FROM ferias WHERE id = ?').get(id);
  res.json(toItem(row));
});

// DELETE /api/ferias/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM ferias WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json({ ok: true });
});

export default router;
