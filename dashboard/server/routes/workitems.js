import { Router } from 'express';

const router = Router();

const ORG     = 'Vector-Brasil';
const PROJECT = 'Roadmap%202025';
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

export default router;
