import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
} from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Todas as rotas exigem autenticação + papel admin
router.use(requireAuth, requireAdmin);

// GET /api/users
router.get('/', (_req, res) => {
  res.json(listUsers());
});

// POST /api/users
router.post('/', async (req, res) => {
  const { nome, email, senha, papel } = req.body;
  if (!nome?.trim() || !email?.trim() || !senha) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }
  const PAPEIS_VALIDOS = ['admin', 'gestor', 'coordenador', 'analista'];
  const papelValido = PAPEIS_VALIDOS.includes(papel) ? papel : 'analista';

  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const id = createUser({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      senhaHash,
      papel: papelValido,
    });
    res.status(201).json({ id, nome: nome.trim(), email: email.trim().toLowerCase(), papel: papelValido, ativo: 1 });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = getUserById(id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const { nome, email, senha, papel, ativo } = req.body;

  // Impede que o admin remova seu próprio papel de admin
  if (req.user.id === id && papel && papel !== 'admin') {
    return res.status(400).json({ error: 'Você não pode remover sua própria permissão de administrador' });
  }

  try {
    const senhaHash = senha ? await bcrypt.hash(senha, 10) : user.senha_hash;
    const PAPEIS_VALIDOS = ['admin', 'gestor', 'coordenador', 'analista'];
    const papelValido = PAPEIS_VALIDOS.includes(papel) ? papel : user.papel;

    updateUser(id, {
      nome:      nome?.trim()  || user.nome,
      email:     email?.trim().toLowerCase() || user.email,
      senhaHash,
      papel:     papelValido,
      ativo:     ativo !== undefined ? (ativo ? 1 : 0) : user.ativo,
    });
    res.json({ ok: true });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (req.user.id === id) {
    return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
  }
  const user = getUserById(id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  deleteUser(id);
  res.json({ ok: true });
});

export default router;
