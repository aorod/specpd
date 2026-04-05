import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByEmail } from '../db.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'specpd-dev-secret-change-in-production';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  const user = getUserByEmail(email.trim().toLowerCase());
  if (!user || !user.ativo) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const valid = await bcrypt.compare(senha, user.senha_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const payload = { id: user.id, nome: user.nome, email: user.email, papel: user.papel };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

  res.json({ token, user: payload });
});

// GET /api/auth/me — valida o token e retorna dados do usuário atual
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

export default router;
