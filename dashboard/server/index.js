import express from 'express';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { requireAuth }       from './middleware/authMiddleware.js';
import dayoffsRouter         from './routes/dayoffs.js';
import feriasRouter          from './routes/ferias.js';
import calendarRouter        from './routes/calendar.js';
import authRouter            from './routes/auth.js';
import usersRouter           from './routes/users.js';
import workitemsRouter       from './routes/workitems.js';
import userPreferencesRouter from './routes/userpreferences.js';
import {
  isCacheValid,
  getCachedItems,
  saveItems,
  logSync,
  getLastSync,
  getItemCount,
  getCacheTTLMinutes,
  getUserCount,
  createUser,
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, '.env') });
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use('/api/auth',             authRouter);
app.use('/api/users',            usersRouter);
app.use('/api/user-preferences', userPreferencesRouter);
app.use('/api/dayoffs',          dayoffsRouter);
app.use('/api/ferias',           feriasRouter);
app.use('/api/calendar',         calendarRouter);
app.use('/api/workitems',        workitemsRouter);

const ORG = process.env.ADO_ORG;
const PROJECT_2026 = process.env.ADO_PROJECT_2026;
const ED_PROJECT_ENV = process.env.ADO_PROJECT_ED;
const BASE_URL_2026 = `https://analytics.dev.azure.com/${ORG}/${PROJECT_2026}/_odata/v3.0-preview`;
const ORG_BASE_URL  = `https://analytics.dev.azure.com/${ORG}/_odata/v3.0-preview`;

const MES_FIELD = 'Custom_ac3892be__002De47f__002D4103__002Da7a5__002D74b5b56ddb83';

const WI_SELECT = [
  'WorkItemId', 'WorkItemType', 'Title', 'State', 'TagNames',
  'Custom_SubStatus', 'Custom_RequisitoSK', 'Custom_DesignerSK',
  'Custom_ProdutoControladoria', 'Custom_Equipe', 'Custom_Ano',
  'Custom_Atividade', 'Effort',
  'Custom_Embarcador', 'Custom_Solicitante',
  MES_FIELD, 'AssignedToUserSK',
].join(',');

function authHeader(token) {
  return `Basic ${Buffer.from(`:${token}`).toString('base64')}`;
}

function transformItem(item, userMap, projeto) {
  const mesRaw = item[MES_FIELD] || '';
  const monthPart = mesRaw ? String(mesRaw).split(' - ')[0].padStart(2, '0') : '';
  const projetoAno = projeto ? (projeto.match(/\b(\d{4})\b/) || [])[1] ?? '' : '';
  return {
    id:           `${item.WorkItemType === 'Timesheet' ? 'TS' : 'UC'}-${item.WorkItemId}`,
    workItemType: item.WorkItemType,
    title:        item.Title || '',
    assignedTo:   userMap.get(item.AssignedToUserSK) || '',
    state:        item.State || '',
    subStatus:    item.Custom_SubStatus || '',
    requisito:    userMap.get(item.Custom_RequisitoSK) || '',
    mes:          monthPart,
    ano:          String(item.Custom_Ano || '') || projetoAno,
    designer:     userMap.get(item.Custom_DesignerSK) || '',
    produto:      item.Custom_ProdutoControladoria || '',
    tags:         item.TagNames || '',
    atividade:    item.Custom_Atividade || '',
    equipe:       item.Custom_Equipe || '',
    effort:       item.Effort ?? null,
    embarcador:   item.Custom_Embarcador || '',
    solicitante:  item.Custom_Solicitante || '',
    projeto:      projeto || '',
  };
}

async function fetchAllPages(url, headers) {
  const items = [];
  let nextUrl = url;
  while (nextUrl) {
    const res = await fetch(nextUrl, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ADO ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    items.push(...(data.value || []));
    nextUrl = data['@odata.nextLink'] || null;
  }
  return items;
}

// Busca dados frescos do ADO e persiste no cache
async function fetchFromADO() {
  const token = process.env.ADO_TOKEN;
  if (!token) throw new Error('ADO_TOKEN não configurado no servidor');

  const headers = {
    Authorization: authHeader(token),
    Accept: 'application/json',
  };

  const usersUrl = `${ORG_BASE_URL}/Users?$select=UserSK,UserName`;
  const usersRaw = await fetchAllPages(usersUrl, headers);
  const userMap = new Map(usersRaw.map((u) => [u.UserSK, u.UserName]));

  const filterTS      = encodeURIComponent("WorkItemType eq 'Timesheet'");
  const filterStories = encodeURIComponent("WorkItemType eq 'Stories'");

  const [storiesRaw, tsRaw] = await Promise.all([
    fetchAllPages(`${BASE_URL_2026}/WorkItems?$filter=${filterStories}&$select=${WI_SELECT}`, headers),
    fetchAllPages(`${BASE_URL_2026}/WorkItems?$filter=${filterTS}&$select=${WI_SELECT}`, headers),
  ]);

  const result = [
    ...storiesRaw.map((item) => transformItem({ ...item, WorkItemType: 'Caso de Uso' }, userMap, 'Roadmap 2026')),
    ...tsRaw.map((item) => transformItem(item, userMap, 'Roadmap 2026')),
  ];
  saveItems(result);
  logSync('success', result.length);
  return result;
}

// ── GET /api/analytics ────────────────────────────────────────────────────────
// Serve do cache se válido; caso contrário busca no ADO e atualiza o cache.
// Em caso de falha no ADO, retorna cache obsoleto (com header X-Cache: stale).
app.get('/api/analytics', async (_req, res) => {
  if (isCacheValid()) {
    return res.json(getCachedItems());
  }

  try {
    const result = await fetchFromADO();
    return res.json(result);
  } catch (err) {
    logSync('error', 0, err.message);
    const cached = getCachedItems();
    if (cached.length) {
      res.set('X-Cache', 'stale');
      return res.json(cached);
    }
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sync ────────────────────────────────────────────────────────────
// Força uma sincronização imediata com o ADO, ignorando o TTL do cache.
app.post('/api/sync', async (_req, res) => {
  try {
    const result = await fetchFromADO();
    res.json({ ok: true, itemsCount: result.length });
  } catch (err) {
    logSync('error', 0, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/cache/status ─────────────────────────────────────────────────────
// Informa o estado atual do cache local.
app.get('/api/cache/status', (_req, res) => {
  res.json({
    cacheValid:   isCacheValid(),
    itemCount:    getItemCount(),
    ttlMinutes:   getCacheTTLMinutes(),
    lastSync:     getLastSync(),
  });
});

// ── Esteira E&D (Especificações e Design) ─────────────────────────────────────
const ED_PROJECT  = ED_PROJECT_ENV;
const ED_BASE_URL = `https://analytics.dev.azure.com/${ORG}/${ED_PROJECT}/_odata/v3.0-preview`;

const ED_SELECT = [
  'WorkItemId', 'WorkItemType', 'Title', 'State', 'TagNames',
  'Custom_FocalDesignSK', 'Custom_FocalRequisitoSK',
  'Custom_PDApoio1SK', 'Custom_PDApoio2SK', 'Custom_REQApoio1SK',
  'Custom_ProdutoControladoria', 'Custom_FocusSquad', 'Custom_Datadeentregaprevisto',
].join(',');

const ED_EXPAND = 'Iteration($select=IterationPath,IterationName),Area($select=AreaPath,AreaName)';

const STATE_TO_COLUMN = {
  'Backlog':               'backlog',
  'Pausado':               'pausado',
  'Descobrir/Definir':     'descobrir-definir',
  'Desenvolver/Entregar':  'desenvolver-entregar',
  'Review/Refinamento':    'review-refinamento',
  'Squad':                 'squad',
  'Em teste':              'em-teste',
  'Concluído':             'concluido',
};

function transformEDItem(item, userMap) {
  const tags = item.TagNames
    ? item.TagNames.split(';').map(t => t.trim()).filter(Boolean)
    : [];
  const isER = tags.some(t => /engenharia reversa/i.test(t));

  return {
    id:                  item.WorkItemId,
    workItemType:        item.WorkItemType || '',
    title:               item.Title || '',
    coluna:              STATE_TO_COLUMN[item.State] ?? 'backlog',
    grupo:               'Sem Grupo',
    status:              item.State || '',
    fluxo:               isER ? 'ER' : 'Normal',
    focalDesign:         userMap.get(item.Custom_FocalDesignSK) || '',
    focalRequisito:      userMap.get(item.Custom_FocalRequisitoSK) || '',
    pdApoio1:            userMap.get(item.Custom_PDApoio1SK) || '',
    pdApoio2:            userMap.get(item.Custom_PDApoio2SK) || '',
    reqApoio1:           userMap.get(item.Custom_REQApoio1SK) || '',
    produto:             item.Custom_ProdutoControladoria || '',
    focusSquad:          item.Custom_FocusSquad || '',
    dataEntregaPrevista: item.Custom_Datadeentregaprevisto || null,
    mes: (() => {
      const parts = (item.Iteration?.IterationPath || '').split('\\');
      const last = parts[parts.length - 1] || '';
      // Captura "1 - Janeiro" ou "01 - Janeiro" e normaliza com zero à esquerda
      const match = last.match(/(\d{1,2})\s*-\s*(.+)/);
      return match ? `${match[1].padStart(2, '0')} - ${match[2].trim()}` : '';
    })(),
    ano: (() => {
      const match = (item.Area?.AreaPath || '').match(/\b(\d{4})\b/);
      return match ? match[1] : '';
    })(),
    tags,
  };
}

let edCache = { items: [], fetchedAt: 0 };
const ED_CACHE_TTL_MS = (parseInt(process.env.CACHE_TTL_MINUTES) || 30) * 60 * 1000;

async function fetchFromADO_ED() {
  const token = process.env.ADO_TOKEN;
  if (!token) throw new Error('ADO_TOKEN não configurado no servidor');

  const headers = { Authorization: authHeader(token), Accept: 'application/json' };

  const usersRaw = await fetchAllPages(`${ORG_BASE_URL}/Users?$select=UserSK,UserName`, headers);
  const userMap  = new Map(usersRaw.map(u => [u.UserSK, u.UserName]));

  const filter = encodeURIComponent("WorkItemType eq 'Issue'");
  const expand = encodeURIComponent(ED_EXPAND);
  const raw    = await fetchAllPages(`${ED_BASE_URL}/WorkItems?$filter=${filter}&$select=${ED_SELECT}&$expand=${expand}`, headers);
  const items = raw.map(item => transformEDItem(item, userMap));

  edCache = { items, fetchedAt: Date.now() };
  return items;
}

app.get('/api/esteira-ed', async (_req, res) => {
  if (edCache.items.length > 0 && Date.now() - edCache.fetchedAt < ED_CACHE_TTL_MS) {
    return res.json(edCache.items);
  }
  try {
    return res.json(await fetchFromADO_ED());
  } catch (err) {
    if (edCache.items.length) {
      res.set('X-Cache', 'stale');
      return res.json(edCache.items);
    }
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/esteira-ed/sync', async (_req, res) => {
  try {
    const result = await fetchFromADO_ED();
    res.json({ ok: true, itemsCount: result.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Rotas de diagnóstico — requerem autenticação ──────────────────────────────
app.use('/api/debug', requireAuth);

// ── GET /api/debug/ed-paths ───────────────────────────────────────────────────
// Diagnóstico: inspeciona Custom_MonthWorked e Custom_YearWorked de todos os Issues do E&D.
app.get('/api/debug/ed-paths', async (_req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado no servidor' });

  const headers = { Authorization: authHeader(token), Accept: 'application/json' };

  try {
    const filter = encodeURIComponent("WorkItemType eq 'Issue'");
    const select = encodeURIComponent('WorkItemId,Title,State');
    const expand = encodeURIComponent(ED_EXPAND);
    const raw = await fetchAllPages(
      `${ED_BASE_URL}/WorkItems?$filter=${filter}&$select=${select}&$expand=${expand}`,
      headers,
    );

    if (!raw.length) return res.json({ message: 'Nenhum Issue encontrado no projeto E&D', items: [] });

    const items = raw.map(item => ({
      id:            item.WorkItemId,
      title:         item.Title,
      state:         item.State,
      iterationPath: item.Iteration?.IterationPath || null,
      areaPath:      item.Area?.AreaPath || null,
      mes: (() => {
        const parts = (item.Iteration?.IterationPath || '').split('\\');
        const last = parts[parts.length - 1] || '';
        const match = last.match(/(\d{1,2})\s*-\s*(.+)/);
        return match ? `${match[1].padStart(2, '0')} - ${match[2].trim()}` : null;
      })(),
      ano: (() => {
        const match = (item.Area?.AreaPath || '').match(/\b(\d{4})\b/);
        return match ? match[1] : null;
      })(),
    }));

    const semMes        = items.filter(i => !i.mes).length;
    const semAno        = items.filter(i => !i.ano).length;
    const meses         = [...new Set(items.map(i => i.mes).filter(Boolean))].sort();
    const anos          = [...new Set(items.map(i => i.ano).filter(Boolean))].sort((a, b) => b - a);
    const iterPaths     = [...new Set(raw.map(i => i.Iteration?.IterationPath).filter(Boolean))].sort();
    const areaPaths     = [...new Set(raw.map(i => i.Area?.AreaPath).filter(Boolean))].sort();

    res.json({ total: items.length, semMes, semAno, meses, anos, iterPaths, areaPaths, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/debug/timesheet-fields ──────────────────────────────────────────
// Diagnóstico: inspeciona os campos brutos do Timesheet no ADO.
app.get('/api/debug/timesheet-fields', async (_req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado no servidor' });

  const headers = {
    Authorization: authHeader(token),
    Accept: 'application/json',
  };

  try {
    const filter = encodeURIComponent("WorkItemType eq 'Timesheet'");
    const url = `${BASE_URL_2026}/WorkItems?$filter=${filter}&$top=1`;
    const raw = await fetchAllPages(url, headers);

    if (!raw.length) return res.json({ message: 'Nenhum Timesheet encontrado', fields: [] });

    const sample = raw[0];
    const fields = Object.keys(sample).map((key) => ({ field: key, value: sample[key] }));
    res.json({ totalFound: raw.length, sampleFields: fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/debug/caso-de-uso-fields ────────────────────────────────────────
// Diagnóstico: inspeciona todos os campos brutos de um Caso de Uso no ADO.
app.get('/api/debug/caso-de-uso-fields', async (_req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado no servidor' });

  const headers = { Authorization: authHeader(token), Accept: 'application/json' };

  try {
    const filter = encodeURIComponent("WorkItemType eq 'Stories'");
    const url = `${BASE_URL_2026}/WorkItems?$filter=${filter}&$top=1`;
    const raw = await fetchAllPages(url, headers);

    if (!raw.length) return res.json({ message: 'Nenhum Caso de Uso encontrado', fields: [] });

    const sample = raw[0];
    const fields = Object.keys(sample).map((key) => ({ field: key, value: sample[key] }));
    res.json({ totalFound: raw.length, sampleFields: fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/debug/analytics-item/:id ────────────────────────────────────────
// Diagnóstico: busca um work item específico na Analytics API e exibe todos os campos brutos.
app.get('/api/debug/analytics-item/:id', async (req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado no servidor' });

  const headers = { Authorization: authHeader(token), Accept: 'application/json' };
  const wiId = Number(req.params.id);

  try {
    const filter = encodeURIComponent(`WorkItemId eq ${wiId}`);
    const url = `${BASE_URL_2026}/WorkItems?$filter=${filter}`;
    const raw = await fetchAllPages(url, headers);

    if (!raw.length) return res.json({ message: `Item ${wiId} não encontrado na Analytics API` });

    const item = raw[0];
    const fields = Object.entries(item).map(([key, value]) => ({ field: key, value }));
    res.json({ workItemId: wiId, fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/debug/caso-de-uso-wi-fields/:id ─────────────────────────────────
// Diagnóstico: busca um Caso de Uso via Work Items REST API e exibe todos os campos brutos.
// Aceita um ID específico: /api/debug/caso-de-uso-wi-fields/35414
app.get('/api/debug/caso-de-uso-wi-fields/:id?', async (req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado no servidor' });

  const headers = { Authorization: authHeader(token), Accept: 'application/json', 'Content-Type': 'application/json' };
  const ORG_RAW = process.env.ADO_ORG;
  const PROJECT_RAW = decodeURIComponent(process.env.ADO_PROJECT_2026 || '');

  try {
    let wiId = req.params.id ? Number(req.params.id) : null;

    if (!wiId) {
      const wiqlUrl = `https://dev.azure.com/${ORG_RAW}/${encodeURIComponent(PROJECT_RAW)}/_apis/wit/wiql?api-version=7.1`;
      const wiqlRes = await fetch(wiqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Caso de Uso' ORDER BY [System.Id] DESC" }),
      });
      const wiqlData = await wiqlRes.json();
      wiId = wiqlData.workItems?.[0]?.id;
      if (!wiId) return res.json({ message: 'Nenhum Caso de Uso encontrado' });
    }

    const wiUrl = `https://dev.azure.com/${ORG_RAW}/${encodeURIComponent(PROJECT_RAW)}/_apis/wit/workitems/${wiId}?$expand=fields&api-version=7.1`;
    const wiRes = await fetch(wiUrl, { headers });
    const wiData = await wiRes.json();

    const fields = Object.entries(wiData.fields || {}).map(([key, value]) => ({ field: key, value }));
    res.json({ workItemId: wiId, fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/wit-types-2026 ───────────────────────────────────────────────────
// Diagnóstico público: lista os WorkItemTypes distintos do projeto Roadmap 2026.
app.get('/api/wit-types-2026', async (_req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado' });
  const headers = { Authorization: authHeader(token), Accept: 'application/json' };
  try {
    const url = `${BASE_URL_2026}/WorkItems?$apply=groupby((WorkItemType))`;
    const raw = await fetchAllPages(url, headers);
    const types = raw.map((r) => r.WorkItemType).filter(Boolean).sort();
    res.json({ types, total: types.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Em produção, serve o build do frontend
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// ── Seed: cria admin padrão se não houver nenhum usuário ─────────────────────
async function seedDefaultAdmin() {
  if (getUserCount() > 0) return;

  const DEFAULT_EMAIL = 'admin@specpd.com';
  const DEFAULT_SENHA = 'Admin@1234';

  const senhaHash = await bcrypt.hash(DEFAULT_SENHA, 10);
  createUser({ nome: 'Administrador', email: DEFAULT_EMAIL, senhaHash, papel: 'admin' });

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Usuário administrador criado automaticamente    ║');
  console.log(`║  E-mail: ${DEFAULT_EMAIL.padEnd(40)}║`);
  console.log(`║  Senha:  ${DEFAULT_SENHA.padEnd(40)}║`);
  console.log('║  ⚠  Altere a senha após o primeiro acesso!      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
}

app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  await seedDefaultAdmin();
});
