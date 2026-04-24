# SpecPD — Dashboard de Gestão e Analytics

Dashboard interno da **Vector Brasil** para visualização de dados do Azure DevOps, gestão de equipe e acompanhamento de projetos.

---

## Funcionalidades

- Visualização de **Casos de Uso** e **Timesheet** integrados ao Azure DevOps
- Acompanhamento da **Esteira E&D** (Especificações e Design)
- Gestão de **Férias** e **Abonos** (Day-offs)
- **Calendário** corporativo
- Controle de acesso por perfis: `admin`, `viewer`, `viewer-read`

---

## Stack Técnica

### Frontend
- **React 18** com Vite 5 (bundler + dev server)
- **Recharts** para gráficos
- **Lucide React** para ícones
- Estado gerenciado via React Context

### Backend
- **Node.js ≥18** + **Express 4**
- **SQLite** via `better-sqlite3` (WAL mode, sem ORM)
- **JWT** para autenticação (8h de expiração)
- **bcryptjs** para hash de senhas

### Integração Externa
- **Azure DevOps Analytics API** (OData v3.0-preview)
- Cache TTL de 30 minutos no SQLite

---

## Estrutura do Projeto

```
specpd/
├── dashboard/
│   ├── src/                  # Frontend React
│   │   ├── components/       # Componentes UI
│   │   ├── pages/            # Páginas da aplicação
│   │   ├── api/              # Clientes de API
│   │   ├── context/          # React Context (AuthContext)
│   │   ├── hooks/            # Custom hooks
│   │   └── utils/            # Utilitários
│   ├── server/               # Backend Express
│   │   ├── routes/           # Rotas REST
│   │   ├── db.js             # Camada de banco de dados
│   │   └── data.db           # Banco SQLite
│   └── vite.config.js        # Configuração Vite
├── docker-compose.yml        # Ambiente de desenvolvimento
└── docker-compose.prod.yml   # Ambiente de produção
```

---

## Como Rodar

### Com Docker (recomendado)

**Desenvolvimento (hot reload):**
```bash
docker-compose up
```

**Produção:**
```bash
docker-compose -f docker-compose.prod.yml up
```

### Sem Docker

```bash
# Instalar dependências
cd dashboard && npm install
cd server && npm install

# Subir o backend (porta 3001)
npm run server

# Subir o frontend (porta 5173)
npm run dev
```

### Variáveis de Ambiente

Crie um arquivo `.env` em `dashboard/server/`:

```env
ADO_ORG=<sua-org-azure-devops>
ADO_TOKEN=<seu-personal-access-token>
JWT_SECRET=<chave-secreta>
CACHE_TTL_MINUTES=30
```

---

## Tooling

| Ferramenta | Uso |
|---|---|
| ESLint 9 (flat config) | Linting com regras React |
| Prettier | Formatação de código |
| Docker Compose | Orquestração dev/prod |

```bash
# Lint
npm run lint

# Build de produção
npm run build
```

---

## Banco de Dados

SQLite com as seguintes tabelas principais:

| Tabela | Descrição |
|---|---|
| `work_items` | Work items sincronizados do Azure DevOps |
| `sync_log` | Controle de cache e última sincronização |
| `users` | Usuários e credenciais |
| `user_preferences` | Preferências de colunas por usuário |
| `ferias` | Registros de férias |
| `day_offs` | Registros de abonos |
| `calendar_events` | Eventos do calendário corporativo |
