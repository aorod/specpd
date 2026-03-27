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
const VIEW_ID = '12f1d99e-3e2e-4807-a4e5-48102a5aa7b0';
const BASE_URL = `https://analytics.dev.azure.com/${ORG}/${PROJECT}/_odata/v4.0`;

app.get('/api/analytics', async (req, res) => {
  const token = process.env.ADO_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'ADO_TOKEN não configurado no servidor' });
  }

  const customEndpoint = req.query.endpoint;
  const odata = customEndpoint || `WorkItems?$apply=filter(AnalyticsViewId eq '${VIEW_ID}')`;
  const url = `${BASE_URL}/${odata}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: `Falha na requisição ao Azure DevOps: ${response.status}`,
        detail: text,
      });
    }

    const data = await response.json();
    res.json(data.value ?? data);
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
