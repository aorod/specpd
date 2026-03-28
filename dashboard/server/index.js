import express from 'express';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const ORG = 'vector-brasil';
const PROJECT = 'Roadmap%202025';
const BASE_URL = `https://analytics.dev.azure.com/${ORG}/${PROJECT}/_odata/v3.0-preview`;
const ORG_BASE_URL = `https://analytics.dev.azure.com/${ORG}/_odata/v3.0-preview`;

const MES_FIELD = 'Custom_ac3892be__002De47f__002D4103__002Da7a5__002D74b5b56ddb83';

const WI_SELECT = [
  'WorkItemId', 'WorkItemSK', 'WorkItemType', 'Title', 'State', 'TagNames',
  'Custom_SubStatus', 'Custom_RequisitoSK', 'Custom_DesignerSK',
  'Custom_ProdutoControladoria', 'Custom_Equipe', 'Custom_Ano',
  MES_FIELD, 'AssignedToUserSK',
].join(',');

function authHeader(token) {
  return `Basic ${Buffer.from(`:${token}`).toString('base64')}`;
}

function parseMes(ano, mesStr) {
  if (!ano || !mesStr) return '';
  const monthPart = String(mesStr).split(' - ')[0].padStart(2, '0');
  return `${ano}-${monthPart}`;
}

function transformItem(item, userMap, requisitoAnalystMap) {
  const reqSK = item.Custom_RequisitoSK;
  let requisito = '';
  if (reqSK != null) {
    requisito = requisitoAnalystMap.get(reqSK) || 'linked';
  }

  return {
    id: `UC-${item.WorkItemId}`,
    workItemType: item.WorkItemType,
    title: item.Title || '',
    assignedTo: userMap.get(item.AssignedToUserSK) || '',
    state: item.State || '',
    subStatus: item.Custom_SubStatus || '',
    requisito,
    mes: parseMes(item.Custom_Ano, item[MES_FIELD]),
    designer: userMap.get(item.Custom_DesignerSK) || '',
    produto: item.Custom_ProdutoControladoria || '',
    tags: item.TagNames || '',
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

async function buildRequisitoAnalystMap(requisitoSKs, headers, userMap) {
  const map = new Map();
  if (!requisitoSKs.length) return map;

  // Busca em lotes de 40 para não exceder o limite de URL
  const CHUNK = 40;
  for (let i = 0; i < requisitoSKs.length; i += CHUNK) {
    const chunk = requisitoSKs.slice(i, i + CHUNK);
    const inClause = chunk.map((sk) => `WorkItemSK eq ${sk}`).join(' or ');
    const url = `${BASE_URL}/WorkItems?$filter=${encodeURIComponent(inClause)}&$select=WorkItemSK,AssignedToUserSK`;
    try {
      const items = await fetchAllPages(url, headers);
      for (const r of items) {
        const name = userMap.get(r.AssignedToUserSK) || '';
        if (r.WorkItemSK && name) map.set(r.WorkItemSK, name);
      }
    } catch (e) {
      console.warn('Aviso: não foi possível resolver analistas do requisito:', e.message);
    }
  }
  return map;
}

app.get('/api/analytics', async (_req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado no servidor' });

  const headers = {
    Authorization: authHeader(token),
    Accept: 'application/json',
  };

  try {
    // 1. Busca todos os usuários para resolver SKs → nomes
    const usersUrl = `${ORG_BASE_URL}/Users?$select=UserSK,UserName`;
    const usersRaw = await fetchAllPages(usersUrl, headers);
    const userMap = new Map(usersRaw.map((u) => [u.UserSK, u.UserName]));

    // 2. Busca WorkItems do tipo Caso de Uso
    const filter = encodeURIComponent("WorkItemType eq 'Caso de Uso'");
    const wiUrl = `${BASE_URL}/WorkItems?$filter=${filter}&$select=${WI_SELECT}`;
    const wiRaw = await fetchAllPages(wiUrl, headers);

    // 3. Resolve analistas de requisito (WorkItemSK dos itens linkados)
    const requisitoSKs = [...new Set(wiRaw.map((i) => i.Custom_RequisitoSK).filter((sk) => sk != null))];
    const requisitoAnalystMap = await buildRequisitoAnalystMap(requisitoSKs, headers, userMap);

    // 4. Transforma e retorna
    const result = wiRaw.map((item) => transformItem(item, userMap, requisitoAnalystMap));
    res.json(result);
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

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
