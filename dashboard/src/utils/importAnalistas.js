/**
 * Utilitários para importação de analistas a partir de arquivos XLS/XLSX ou PDF.
 * Espera que o arquivo tenha colunas "Analista" e "Equipe" (case-insensitive).
 */

// ── XLS / XLSX ────────────────────────────────────────────────────────────────
export async function parseXLS(file) {
  const XLSX = await import('xlsx');

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Nenhuma planilha encontrada no arquivo.');

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) throw new Error('Planilha vazia ou sem dados suficientes.');

  // Localizar linha de cabeçalho (pode não ser a primeira linha)
  let headerRowIdx = -1;
  let analistaIdx  = -1;
  let equipeIdx    = -1;

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = rows[i].map(c => c?.toString().toLowerCase().trim());
    const ai = cells.findIndex(c => c?.includes('analista'));
    if (ai !== -1) {
      headerRowIdx = i;
      analistaIdx  = ai;
      equipeIdx    = cells.findIndex(c => c?.includes('equipe'));
      break;
    }
  }

  if (analistaIdx === -1) {
    throw new Error('Coluna "Analista" não encontrada. Verifique se o arquivo possui esse cabeçalho.');
  }

  const dataRows = rows.slice(headerRowIdx + 1);
  const result = dataRows
    .filter(row => row[analistaIdx]?.toString().trim())
    .map((row, idx) => ({
      id:     Date.now() + idx,
      nome:   row[analistaIdx].toString().trim(),
      equipe: equipeIdx !== -1 ? (row[equipeIdx]?.toString().trim() || '') : '',
      ativo:  true,
    }));

  if (result.length === 0) {
    throw new Error('Nenhum analista encontrado na planilha. Verifique se há dados abaixo do cabeçalho.');
  }

  return result;
}

// ── PDF ───────────────────────────────────────────────────────────────────────
export async function parsePDF(file) {
  const pdfjsLib = await import('pdfjs-dist');

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).href;
  }

  const buffer = await file.arrayBuffer();
  const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise;

  // Extrair todas as linhas de texto agrupadas por posição Y
  const allLines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page        = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const yBuckets = {};
    for (const item of textContent.items) {
      const text = item.str?.trim();
      if (!text) continue;
      const y = Math.round(item.transform[5] / 5) * 5; // agrupa em buckets de 5px
      if (!yBuckets[y]) yBuckets[y] = [];
      yBuckets[y].push({ x: item.transform[4], text });
    }

    const sortedYs = Object.keys(yBuckets).map(Number).sort((a, b) => b - a); // PDF: Y cresce de baixo pra cima
    for (const y of sortedYs) {
      const lineText = yBuckets[y]
        .sort((a, b) => a.x - b.x)
        .map(i => i.text)
        .join('\t');
      allLines.push(lineText);
    }
  }

  // Localizar linha de cabeçalho
  let headerIdx   = -1;
  let analistaIdx = -1;
  let equipeIdx   = -1;

  for (let i = 0; i < allLines.length; i++) {
    const cols = allLines[i].split('\t');
    const ai   = cols.findIndex(c => c.toLowerCase().includes('analista'));
    if (ai !== -1) {
      headerIdx   = i;
      analistaIdx = ai;
      equipeIdx   = cols.findIndex(c => c.toLowerCase().includes('equipe'));
      break;
    }
  }

  if (analistaIdx === -1) {
    throw new Error('Coluna "Analista" não encontrada no PDF. Verifique se o documento possui esse cabeçalho.');
  }

  const result = [];
  for (let i = headerIdx + 1; i < allLines.length; i++) {
    const cols = allLines[i].split('\t');
    const nome = cols[analistaIdx]?.trim();
    if (!nome) continue;
    result.push({
      id:     Date.now() + i,
      nome,
      equipe: equipeIdx !== -1 ? (cols[equipeIdx]?.trim() || '') : '',
      ativo:  true,
    });
  }

  if (result.length === 0) {
    throw new Error('Nenhum analista encontrado no PDF. Verifique se há dados abaixo do cabeçalho.');
  }

  return result;
}

// ── Validação de arquivo ──────────────────────────────────────────────────────
const TIPO_CONFIG = {
  xls: {
    label:   'XLS / XLSX',
    accept:  '.xls,.xlsx',
    mimes:   [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    exts:    ['.xls', '.xlsx'],
    parser:  parseXLS,
  },
  pdf: {
    label:   'PDF',
    accept:  '.pdf',
    mimes:   ['application/pdf'],
    exts:    ['.pdf'],
    parser:  parsePDF,
  },
};

export const TIPOS_ARQUIVO = TIPO_CONFIG;

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export function validarArquivo(file, tipoKey) {
  if (!file) return null;
  const cfg = TIPO_CONFIG[tipoKey];
  if (!cfg) return 'Tipo de arquivo inválido.';

  if (file.size > MAX_BYTES) {
    return `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). O limite é 100 MB.`;
  }

  const name    = file.name.toLowerCase();
  const extOk   = cfg.exts.some(e => name.endsWith(e));
  const mimeOk  = !file.type || cfg.mimes.includes(file.type); // alguns SO não enviam MIME

  if (!extOk || !mimeOk) {
    return `Arquivo inválido. Selecione um arquivo ${cfg.label}.`;
  }

  return null; // sem erros
}
