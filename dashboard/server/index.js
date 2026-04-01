import express from 'express';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, '.env') });
const app = express();
const PORT = process.env.PORT || 3001;

const ORG = 'vector-brasil';
const PROJECT = 'Roadmap%202025';
const BASE_URL = `https://analytics.dev.azure.com/${ORG}/${PROJECT}/_odata/v3.0-preview`;
const ORG_BASE_URL = `https://analytics.dev.azure.com/${ORG}/_odata/v3.0-preview`;

const MES_FIELD = 'Custom_ac3892be__002De47f__002D4103__002Da7a5__002D74b5b56ddb83';

const WI_SELECT = [
  'WorkItemId', 'WorkItemType', 'Title', 'State', 'TagNames',
  'Custom_SubStatus', 'Custom_RequisitoSK', 'Custom_DesignerSK',
  'Custom_ProdutoControladoria', 'Custom_Equipe', 'Custom_Ano',
  'Custom_Atividade', 'Effort',
  MES_FIELD, 'AssignedToUserSK',
].join(',');

function authHeader(token) {
  return `Basic ${Buffer.from(`:${token}`).toString('base64')}`;
}


function transformItem(item, userMap) {
  const mesRaw = item[MES_FIELD] || '';
  const monthPart = mesRaw ? String(mesRaw).split(' - ')[0].padStart(2, '0') : '';
  return {
    id: `${item.WorkItemType === 'Timesheet' ? 'TS' : 'UC'}-${item.WorkItemId}`,
    workItemType: item.WorkItemType,
    title: item.Title || '',
    assignedTo: userMap.get(item.AssignedToUserSK) || '',
    state: item.State || '',
    subStatus: item.Custom_SubStatus || '',
    requisito: userMap.get(item.Custom_RequisitoSK) || '',
    mes: monthPart,
    ano: String(item.Custom_Ano || ''),
    designer: userMap.get(item.Custom_DesignerSK) || '',
    produto: item.Custom_ProdutoControladoria || '',
    tags: item.TagNames || '',
    atividade: item.Custom_Atividade || '',
    equipe: item.Custom_Equipe || '',
    effort: item.Effort ?? null,
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

    // 2. Busca WorkItems dos dois tipos em paralelo
    const filterUC = encodeURIComponent("WorkItemType eq 'Caso de Uso'");
    const filterTS = encodeURIComponent("WorkItemType eq 'Timesheet'");

    const [ucRaw, tsRaw] = await Promise.all([
      fetchAllPages(`${BASE_URL}/WorkItems?$filter=${filterUC}&$select=${WI_SELECT}`, headers),
      fetchAllPages(`${BASE_URL}/WorkItems?$filter=${filterTS}&$select=${WI_SELECT}`, headers),
    ]);

    // 3. Transforma e retorna os dois tipos juntos
    const result = [...ucRaw, ...tsRaw].map((item) => transformItem(item, userMap));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint de diagnóstico: inspeciona os campos brutos do Timesheet
app.get('/api/debug/timesheet-fields', async (_req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado no servidor' });

  const headers = {
    Authorization: authHeader(token),
    Accept: 'application/json',
  };

  try {
    const filter = encodeURIComponent("WorkItemType eq 'Timesheet'");
    const url = `${BASE_URL}/WorkItems?$filter=${filter}&$top=1`;
    const raw = await fetchAllPages(url, headers);

    if (!raw.length) return res.json({ message: 'Nenhum Timesheet encontrado', fields: [] });

    const sample = raw[0];
    const fields = Object.keys(sample).map((key) => ({ field: key, value: sample[key] }));
    res.json({ totalFound: raw.length, sampleFields: fields });
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
