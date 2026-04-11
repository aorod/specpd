// ── Permissões por perfil ─────────────────────────────────────────────────────
// Fonte de verdade: define quais ações cada papel pode executar por módulo.
// Adicionado ferias.editar para refletir a ação de edição existente na UI.

export const PERMISSOES_PERFIL = {
  admin: {
    dashboard:     ['acessar', 'casos_de_uso', 'analytics', 'exportar'],
    timesheet:     ['acessar', 'visualizar', 'editar', 'exportar'],
    ferias:        ['acessar', 'criar', 'editar', 'aprovar', 'rejeitar', 'cancelar'],
    dayoff:        ['acessar', 'criar', 'editar', 'excluir'],
    calendario:    ['acessar', 'adicionar', 'remover'],
    configuracoes: ['acessar', 'editar_integracoes', 'gerenciar_sync'],
    usuarios:      ['acessar', 'criar', 'editar', 'excluir', 'gerenciar_permissoes'],
    perfil:        ['acessar'],
  },
  gestor: {
    dashboard:     ['acessar', 'casos_de_uso', 'analytics', 'exportar'],
    timesheet:     ['acessar', 'visualizar', 'editar', 'exportar'],
    ferias:        ['acessar', 'criar', 'editar', 'aprovar', 'rejeitar', 'cancelar'],
    dayoff:        ['acessar', 'criar', 'editar', 'excluir'],
    calendario:    ['acessar', 'adicionar', 'remover'],
    configuracoes: ['acessar'],
    usuarios:      [],
    perfil:        ['acessar'],
  },
  coordenador: {
    dashboard:     ['acessar', 'casos_de_uso', 'analytics'],
    timesheet:     ['acessar', 'visualizar', 'editar'],
    ferias:        ['acessar', 'criar', 'editar', 'aprovar'],
    dayoff:        ['acessar', 'criar', 'editar'],
    calendario:    ['acessar'],
    configuracoes: [],
    usuarios:      [],
    perfil:        ['acessar'],
  },
  analista: {
    dashboard:     ['acessar', 'casos_de_uso', 'analytics'],
    timesheet:     ['acessar', 'visualizar', 'editar'],
    ferias:        ['acessar', 'criar'],
    dayoff:        ['acessar', 'criar'],
    calendario:    ['acessar'],
    configuracoes: [],
    usuarios:      [],
    perfil:        ['acessar'],
  },
};

// Ações disponíveis por módulo (para o modal de permissões)
export const ACOES_POR_MODULO = {
  dashboard: [
    { key: 'acessar',      label: 'Acessar página' },
    { key: 'casos_de_uso', label: 'Visualizar Casos de Uso' },
    { key: 'analytics',    label: 'Visualizar Analytics' },
    { key: 'exportar',     label: 'Exportar dados' },
  ],
  timesheet: [
    { key: 'acessar',    label: 'Acessar página' },
    { key: 'visualizar', label: 'Visualizar lançamentos' },
    { key: 'editar',     label: 'Editar lançamentos' },
    { key: 'exportar',   label: 'Exportar relatório' },
  ],
  ferias: [
    { key: 'acessar',  label: 'Acessar página' },
    { key: 'criar',    label: 'Criar solicitação' },
    { key: 'editar',   label: 'Editar solicitação' },
    { key: 'aprovar',  label: 'Aprovar solicitação' },
    { key: 'rejeitar', label: 'Rejeitar solicitação' },
    { key: 'cancelar', label: 'Cancelar solicitação' },
  ],
  dayoff: [
    { key: 'acessar', label: 'Acessar página' },
    { key: 'criar',   label: 'Criar registro' },
    { key: 'editar',  label: 'Editar registro' },
    { key: 'excluir', label: 'Excluir registro' },
  ],
  calendario: [
    { key: 'acessar',   label: 'Acessar página' },
    { key: 'adicionar', label: 'Adicionar / Remover Ponto Facultativo' },
    { key: 'remover',   label: 'Remover evento' },
  ],
  configuracoes: [
    { key: 'acessar',            label: 'Acessar página' },
    { key: 'editar_integracoes', label: 'Editar integrações' },
    { key: 'gerenciar_sync',     label: 'Gerenciar sincronização' },
  ],
  usuarios: [
    { key: 'acessar',              label: 'Acessar página' },
    { key: 'criar',                label: 'Criar usuário' },
    { key: 'editar',               label: 'Editar usuário' },
    { key: 'excluir',              label: 'Excluir usuário' },
    { key: 'gerenciar_permissoes', label: 'Gerenciar permissões' },
  ],
  perfil: [
    { key: 'acessar', label: 'Acessar página' },
  ],
};

export const MODULOS = [
  { key: 'dashboard',     label: 'Dashboard & Analytics' },
  { key: 'timesheet',     label: 'Timesheet' },
  { key: 'ferias',        label: 'Férias' },
  { key: 'dayoff',        label: 'DayOff & Abonos' },
  { key: 'calendario',    label: 'Calendário' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'usuarios',      label: 'Usuários & Permissões' },
  { key: 'perfil',        label: 'Perfil' },
];

/**
 * Verifica se um papel tem permissão para uma ação em um módulo.
 * @param {string} papel - O papel do usuário (admin, gestor, etc.)
 * @param {string} modulo - O módulo (dashboard, ferias, etc.)
 * @param {string} acao - A ação (acessar, criar, editar, etc.)
 */
export function hasPermission(papel, modulo, acao) {
  return (PERMISSOES_PERFIL[papel]?.[modulo] ?? []).includes(acao);
}

// ── Permissões individuais por usuário (localStorage) ──────────────────────────
const USER_PERMS_KEY = 'specpd_perms';

/**
 * Carrega as permissões customizadas de um usuário salvas no localStorage.
 * Retorna null se não houver override definido para o usuário.
 */
export function loadUserPermissions(userId) {
  try {
    const raw = localStorage.getItem(`${USER_PERMS_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Persiste as permissões customizadas de um usuário no localStorage.
 */
export function saveUserPermissions(userId, perms) {
  localStorage.setItem(`${USER_PERMS_KEY}_${userId}`, JSON.stringify(perms));
}
