import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getUserPreferences, upsertUserPreferences } from '../db.js';

const router = Router();

const DEFAULT_VISIBLE_CARDS = ['Backlog', 'Desenvolver/Entregar', 'Em teste', 'Concluído'];

// GET /api/user-preferences
// Retorna as preferências do usuário autenticado.
// Se não houver preferência salva, devolve o padrão.
router.get('/', requireAuth, (req, res) => {
  const row = getUserPreferences(req.user.id);
  if (!row) {
    return res.json({ visibleCards: DEFAULT_VISIBLE_CARDS });
  }
  try {
    const visibleCards = JSON.parse(row.visible_cards);
    return res.json({ visibleCards });
  } catch {
    return res.json({ visibleCards: DEFAULT_VISIBLE_CARDS });
  }
});

// PUT /api/user-preferences
// Salva (cria ou atualiza) as preferências do usuário autenticado.
router.put('/', requireAuth, (req, res) => {
  const { visibleCards } = req.body;

  if (!Array.isArray(visibleCards) || visibleCards.length < 4) {
    return res.status(400).json({ error: 'visibleCards deve ser um array com no mínimo 4 itens' });
  }

  upsertUserPreferences(req.user.id, visibleCards);
  return res.json({ ok: true, visibleCards });
});

export default router;
