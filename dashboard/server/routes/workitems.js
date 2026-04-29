import { Router } from 'express';

const router = Router();

const ORG     = 'Vector-Brasil';
const PROJECT = 'Roadmap%202026';
const ADO_WI  = `https://dev.azure.com/${ORG}/${PROJECT}/_apis/wit/workitems`;

// Campo personalizado "Mês" — referência extraída do analytics field name:
// Custom_ac3892be__002De47f__002D4103__002Da7a5__002D74b5b56ddb83
// __002D = '-' (URL encoded) → Custom.ac3892be-e47f-4103-a7a5-74b5b56ddb83
const MES_FIELD_REF = 'Custom.ac3892be-e47f-4103-a7a5-74b5b56ddb83';

function adoAuthHeader(token) {
  return `Basic ${Buffer.from(`:${token}`).toString('base64')}`;
}

// POST /api/workitems/timesheet
router.post('/timesheet', async (req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado no servidor' });

  const { titulo, analista, mes, ano, equipe, produto, atividade, horas, state } = req.body;

  if (!titulo?.trim()) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }

  const ops = [
    { op: 'add', path: '/fields/System.Title', value: titulo.trim() },
  ];

  if (analista?.trim()) ops.push({ op: 'add', path: '/fields/System.AssignedTo', value: analista.trim() });
  if (mes)               ops.push({ op: 'add', path: `/fields/${MES_FIELD_REF}`,                         value: mes });
  if (ano)               ops.push({ op: 'add', path: '/fields/Custom.Ano',                              value: Number(ano) });
  if (equipe?.trim())    ops.push({ op: 'add', path: '/fields/Custom.Equipe',                           value: equipe.trim() });
  if (produto?.trim())   ops.push({ op: 'add', path: '/fields/Custom.ProdutoControladoria',             value: produto.trim() });
  if (atividade?.trim()) ops.push({ op: 'add', path: '/fields/Custom.Atividade',                        value: atividade.trim() });
  if (horas != null)     ops.push({ op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.Effort',        value: Number(horas) });
  if (state?.trim())     ops.push({ op: 'add', path: '/fields/System.State',                            value: state.trim() });

  try {
    const url = `${ADO_WI}/$Timesheet?api-version=7.1`;
    const adoRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: adoAuthHeader(token),
        'Content-Type': 'application/json-patch+json',
        Accept: 'application/json',
      },
      body: JSON.stringify(ops),
    });

    // Lê o corpo como texto primeiro para evitar parse errors com respostas vazias/HTML
    const rawText = await adoRes.text();

    let adoData = null;
    try {
      adoData = rawText ? JSON.parse(rawText) : null;
    } catch {
      // ADO retornou algo que não é JSON (HTML de login, body vazio, etc.)
      if (adoRes.status === 401 || adoRes.status === 403) {
        return res.status(403).json({
          error: `Sem permissão para criar work items (HTTP ${adoRes.status}). O ADO_TOKEN precisa ter escopo "Work Items (Read & Write)". Acesse: Azure DevOps → User Settings → Personal Access Tokens.`,
        });
      }
      return res.status(adoRes.status || 500).json({
        error: `Azure DevOps retornou resposta inesperada (HTTP ${adoRes.status}): ${rawText.slice(0, 300) || '(vazio)'}`,
      });
    }

    if (!adoRes.ok) {
      if (adoRes.status === 401 || adoRes.status === 403) {
        return res.status(403).json({
          error: `Sem permissão para criar work items (HTTP ${adoRes.status}). O ADO_TOKEN precisa ter escopo "Work Items (Read & Write)". Acesse: Azure DevOps → User Settings → Personal Access Tokens.`,
        });
      }
      const msg = adoData?.message || adoData?.error?.message || `ADO ${adoRes.status}`;
      return res.status(adoRes.status).json({ error: msg });
    }

    const htmlUrl = adoData?._links?.html?.href
      ?? `https://dev.azure.com/${ORG}/${PROJECT}/_workitems/edit/${adoData?.id}`;

    res.status(201).json({ id: adoData.id, url: htmlUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/workitems/timesheet/:id — atualiza work item existente
router.patch('/timesheet/:id', async (req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado no servidor' });

  const wiId = Number(req.params.id);
  if (!wiId) return res.status(400).json({ error: 'ID inválido' });

  const { titulo, analista, mes, ano, equipe, produto, atividade, horas, state } = req.body;

  if (!titulo?.trim()) return res.status(400).json({ error: 'Título é obrigatório' });

  const ops = [
    { op: 'replace', path: '/fields/System.Title', value: titulo.trim() },
  ];

  if (analista?.trim()) ops.push({ op: 'replace', path: '/fields/System.AssignedTo',                  value: analista.trim() });
  if (mes)               ops.push({ op: 'replace', path: `/fields/${MES_FIELD_REF}`,                   value: mes });
  if (ano)               ops.push({ op: 'replace', path: '/fields/Custom.Ano',                        value: Number(ano) });
  if (equipe?.trim())    ops.push({ op: 'replace', path: '/fields/Custom.Equipe',                     value: equipe.trim() });
  if (produto?.trim())   ops.push({ op: 'replace', path: '/fields/Custom.ProdutoControladoria',       value: produto.trim() });
  if (atividade?.trim()) ops.push({ op: 'replace', path: '/fields/Custom.Atividade',                  value: atividade.trim() });
  if (horas != null)     ops.push({ op: 'replace', path: '/fields/Microsoft.VSTS.Scheduling.Effort',  value: Number(horas) });
  if (state?.trim())     ops.push({ op: 'replace', path: '/fields/System.State',                      value: state.trim() });

  try {
    const url = `${ADO_WI}/${wiId}?api-version=7.1`;
    const adoRes = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: adoAuthHeader(token),
        'Content-Type': 'application/json-patch+json',
        Accept: 'application/json',
      },
      body: JSON.stringify(ops),
    });

    const rawText = await adoRes.text();
    let adoData = null;
    try { adoData = rawText ? JSON.parse(rawText) : null; } catch {
      return res.status(adoRes.status || 500).json({
        error: `Azure DevOps retornou resposta inesperada (HTTP ${adoRes.status}): ${rawText.slice(0, 300) || '(vazio)'}`,
      });
    }

    if (!adoRes.ok) {
      if (adoRes.status === 401 || adoRes.status === 403) {
        return res.status(403).json({
          error: `Sem permissão para editar work items (HTTP ${adoRes.status}). Verifique o escopo do ADO_TOKEN.`,
        });
      }
      return res.status(adoRes.status).json({ error: adoData?.message || `ADO ${adoRes.status}` });
    }

    const htmlUrl = adoData?._links?.html?.href
      ?? `https://dev.azure.com/${ORG}/${PROJECT}/_workitems/edit/${wiId}`;

    res.json({ id: adoData?.id ?? wiId, url: htmlUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Campos a ignorar no histórico (ruído do sistema) ────────────────────────
const SKIP_FIELDS = new Set([
  'System.Rev', 'System.AuthorizedDate', 'System.RevisedDate',
  'System.ChangedDate', 'System.Watermark', 'System.AuthorizedAs',
  'System.ChangedBy', 'System.PersonId', 'System.IsDeleted',
  'System.CommentCount', 'System.TeamProject', 'System.NodeName',
  'System.AreaLevel1', 'System.AreaLevel2', 'System.IterationLevel1',
  'System.IterationLevel2', 'System.AreaId', 'System.IterationId',
  'System.BoardColumnDone',
]);

const FIELD_LABELS = {
  'System.State':                          'Estado',
  'System.AssignedTo':                     'Responsável',
  'System.Title':                          'Título',
  'System.Tags':                           'Tags',
  'System.Description':                    'Descrição',
  'System.BoardColumn':                    'Coluna do Board',
  'Custom.SubStatus':                      'Sub Status',
  'Custom.ProdutoControladoria':           'Produto',
  'Custom.Ano':                            'Ano',
  'Custom.Equipe':                         'Equipe',
  'Custom.Atividade':                      'Atividade',
  'Custom.Datadeentregaprevisto':          'Data de Deploy',
  'Custom.Conceito':                       'Conceito',
  'Microsoft.VSTS.Scheduling.Effort':      'Effort',
};

function formatFieldValue(fieldName, value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value !== null) {
    return value.displayName || value.name || JSON.stringify(value);
  }
  if (fieldName === 'Custom.Datadeentregaprevisto' && value) {
    try { return new Date(value).toLocaleDateString('pt-BR'); } catch { /* fall */ }
  }
  return String(value);
}

function transformHistoryFields(fields) {
  const result = [];
  for (const [key, change] of Object.entries(fields || {})) {
    if (SKIP_FIELDS.has(key)) continue;
    const oldVal = formatFieldValue(key, change.oldValue);
    const newVal = formatFieldValue(key, change.newValue);
    if (oldVal === newVal) continue;
    result.push({
      field: key,
      label: FIELD_LABELS[key] || key.split('.').pop(),
      oldValue: oldVal,
      newValue: newVal,
    });
  }
  return result;
}

/**
 * O ADO usa 9999-01-01 como data sentinela para a revisão ativa (ainda não encerrada).
 * Nesse caso, usa System.ChangedDate ou System.AuthorizedDate dos campos brutos como fallback.
 */
function resolveRevisedDate(u) {
  const raw = u.revisedDate;
  if (raw && new Date(raw).getFullYear() < 9000) return raw;

  // Fallback: System.ChangedDate.newValue (data real da alteração)
  const changed = u.fields?.['System.ChangedDate'];
  if (changed?.newValue) return changed.newValue;
  if (changed?.oldValue) return changed.oldValue;

  // Fallback: System.AuthorizedDate
  const auth = u.fields?.['System.AuthorizedDate'];
  if (auth?.newValue) return auth.newValue;

  return null; // sem data confiável — descartar
}

function mapUpdate(u, extraFields = {}) {
  const fields = transformHistoryFields(u.fields);
  const relAdded   = (u.relations?.added   || []).length;
  const relRemoved = (u.relations?.removed || []).length;
  if (fields.length === 0 && relAdded === 0 && relRemoved === 0) return null;

  const revisedDate = resolveRevisedDate(u);
  if (!revisedDate) return null; // descarta entradas sem data confiável

  return {
    ...extraFields,
    id:          u.id,
    revisedBy:   u.revisedBy?.displayName || '',
    revisedDate,
    fields,
    relations: (relAdded > 0 || relRemoved > 0)
      ? { added: relAdded, removed: relRemoved }
      : null,
  };
}

// GET /api/workitems/:id/history — histórico de um único work item
router.get('/:id/history', async (req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado' });

  const wiId = Number(req.params.id);
  if (!wiId) return res.status(400).json({ error: 'ID inválido' });

  try {
    const url = `https://dev.azure.com/${ORG}/${PROJECT}/_apis/wit/workitems/${wiId}/updates?api-version=7.0`;
    const adoRes = await fetch(url, {
      headers: { Authorization: adoAuthHeader(token), Accept: 'application/json' },
    });
    const rawText = await adoRes.text();
    let data;
    try { data = JSON.parse(rawText); } catch {
      return res.status(500).json({ error: `Resposta inválida: ${rawText.slice(0, 200)}` });
    }
    if (!adoRes.ok) {
      return res.status(adoRes.status).json({ error: data?.message || `ADO ${adoRes.status}` });
    }

    const updates = (data.value || [])
      .map(u => mapUpdate(u))
      .filter(Boolean)
      .sort((a, b) => new Date(b.revisedDate) - new Date(a.revisedDate)); // mais recente primeiro

    res.json(updates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workitems/history/batch — histórico de múltiplos work items (max 50)
router.post('/history/batch', async (req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) return res.status(500).json({ error: 'ADO_TOKEN não configurado' });

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids (array) é obrigatório' });
  }

  const limited = ids.slice(0, 50);

  try {
    const results = await Promise.allSettled(
      limited.map(async (itemId) => {
        const numId = parseInt(String(itemId).replace(/^(UC|TS)-/, ''), 10);
        if (!numId) return [];
        const url = `https://dev.azure.com/${ORG}/${PROJECT}/_apis/wit/workitems/${numId}/updates?api-version=7.0`;
        const adoRes = await fetch(url, {
          headers: { Authorization: adoAuthHeader(token), Accept: 'application/json' },
        });
        if (!adoRes.ok) return [];
        const data = await adoRes.json();
        return (data.value || [])
          .map(u => mapUpdate(u, { workItemId: itemId }))
          .filter(Boolean);
      })
    );

    const all = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => new Date(b.revisedDate) - new Date(a.revisedDate));

    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
