---
name: test-security
description: >
  Use this skill whenever the user wants to run tests, check code coverage, audit security, or validate new code in a JavaScript/React/HTML/CSS project with Docker and SQLite. Triggers include: "rodar testes", "fazer coverage", "testar meu código", "verificar segurança", "auditoria de segurança", "verificar vazamento de dados", "testar componente React", "coverage do projeto", "testes unitários", "testes de integração", "analisar novo código", "checar vulnerabilidades", "proteger contra SQL injection", "XSS", "CSRF", "Docker security", "SQLite seguro". Always use this skill when the user mentions testing, coverage, security scanning, or code validation in any context involving JS, React, HTML, CSS, Docker, or SQLite — even if they phrase it casually like "meu código tá seguro?" or "preciso testar essa função".
---

# Skill: Test, Coverage & Security

Skill completa para rodar testes, medir coverage e auditar segurança em projetos com:
- **Frontend**: JavaScript, React, HTML, CSS
- **Infraestrutura**: Docker
- **Banco de dados**: SQLite (local)

---

## Fluxo Principal

Ao receber código novo ou pedido de teste/segurança:

1. **Identifique o contexto** → Qual parte do stack está envolvida?
2. **Selecione a seção relevante** abaixo e execute os passos
3. **Reporte resultados** no formato estruturado do final deste arquivo

---

## 1. Configuração Inicial do Projeto

### Dependências de Teste (instalar uma vez)

```bash
# Instalar dependências de teste e segurança
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest-environment-jsdom \
  eslint \
  eslint-plugin-security \
  eslint-plugin-react \
  better-sqlite3 \
  audit-ci

# Para coverage HTML
npm install --save-dev jest-html-reporter
```

### jest.config.js (adicionar ao projeto se não existir)

```js
module.exports = {
  testEnvironment: 'jsdom',
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  testMatch: ['**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}'],
};
```

### .eslintrc.json (segurança de código)

```json
{
  "plugins": ["security", "react"],
  "extends": ["eslint:recommended", "plugin:react/recommended", "plugin:security/recommended"],
  "rules": {
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "warn",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-new-buffer": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-possible-timing-attacks": "warn",
    "security/detect-pseudoRandomBytes": "error",
    "no-eval": "error",
    "no-implied-eval": "error"
  }
}
```

---

## 2. Testes Unitários — JavaScript / React

### Padrão de teste para componente React

```jsx
// Exemplo: src/__tests__/MeuComponente.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MeuComponente from '../MeuComponente';

describe('MeuComponente', () => {
  test('renderiza corretamente', () => {
    render(<MeuComponente />);
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  test('não renderiza dados sensíveis no DOM', () => {
    render(<MeuComponente />);
    // Garante que senhas/tokens não aparecem no HTML
    expect(document.body.innerHTML).not.toMatch(/password|token|secret|apikey/i);
  });

  test('inputs sanitizam XSS', async () => {
    render(<MeuComponente />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '<script>alert("xss")</script>');
    // Verificar que o conteúdo é escaped
    expect(input.value).not.toContain('<script>');
  });
});
```

### Padrão de teste para funções utilitárias JS

```js
// Exemplo: src/__tests__/utils.test.js
import { sanitizeInput, validateEmail } from '../utils';

describe('sanitizeInput', () => {
  test('remove tags HTML maliciosas', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).not.toContain('<script>');
  });

  test('não altera texto normal', () => {
    expect(sanitizeInput('Olá, mundo!')).toBe('Olá, mundo!');
  });
});
```

---

## 3. Segurança — JavaScript / React

### Checklist automático (executar antes de cada commit)

```bash
# 1. Audit de dependências npm
npm audit --audit-level=moderate

# 2. Lint com regras de segurança
npx eslint src/ --ext .js,.jsx

# 3. Checar secrets hardcoded
grep -rn --include="*.js" --include="*.jsx" --include="*.env" \
  -E "(password|secret|api_key|apikey|token)\s*=\s*['\"][^'\"]{6,}" \
  src/ && echo "⚠️  POSSÍVEL SECRET HARDCODED ENCONTRADO!" || echo "✅ Nenhum secret hardcoded"

# 4. Verificar .gitignore protege arquivos sensíveis
grep -q ".env" .gitignore && echo "✅ .env no gitignore" || echo "⚠️  .env NÃO está no .gitignore!"
```

### Proteções obrigatórias no código React

```jsx
// ✅ CORRETO: usar textContent, nunca innerHTML com dados do usuário
element.textContent = userInput;

// ❌ ERRADO: XSS via dangerouslySetInnerHTML sem sanitização
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ CORRETO: se precisar de HTML, sanitizar com DOMPurify primeiro
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />

// ✅ CORRETO: CSRF token em requisições
fetch('/api/dados', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
  },
  body: JSON.stringify(data),
});
```

---

## 4. SQLite — Testes e Segurança

### Padrão seguro de queries (SEMPRE usar prepared statements)

```js
// ✅ CORRETO: Prepared statement — imune a SQL Injection
const stmt = db.prepare('SELECT * FROM usuarios WHERE id = ?');
const usuario = stmt.get(userId);

// ❌ ERRADO: Interpolação direta — vulnerável a SQL Injection
const usuario = db.exec(`SELECT * FROM usuarios WHERE id = ${userId}`);

// ✅ CORRETO: Insert com binding
const insert = db.prepare('INSERT INTO usuarios (nome, email) VALUES (?, ?)');
insert.run(nome, email);
```

### Testes para camada de dados SQLite

```js
// src/__tests__/db.test.js
import Database from 'better-sqlite3';

let db;

beforeEach(() => {
  // Usar banco in-memory para testes — nunca o banco de produção
  db = new Database(':memory:');
  db.exec(`CREATE TABLE usuarios (id INTEGER PRIMARY KEY, nome TEXT, email TEXT)`);
});

afterEach(() => db.close());

test('previne SQL injection no campo nome', () => {
  const maliciousInput = "'; DROP TABLE usuarios; --";
  const stmt = db.prepare('INSERT INTO usuarios (nome, email) VALUES (?, ?)');
  // Deve executar sem erro e sem dropar a tabela
  expect(() => stmt.run(maliciousInput, 'test@test.com')).not.toThrow();
  // Tabela ainda deve existir
  const count = db.prepare('SELECT COUNT(*) as c FROM usuarios').get();
  expect(count.c).toBe(1);
});

test('não expõe dados sensíveis no log', () => {
  const consoleSpy = jest.spyOn(console, 'log');
  const stmt = db.prepare('SELECT * FROM usuarios WHERE id = ?');
  stmt.get(1);
  consoleSpy.mock.calls.forEach(call => {
    expect(JSON.stringify(call)).not.toMatch(/password|senha|secret/i);
  });
  consoleSpy.mockRestore();
});
```

### Segurança do arquivo SQLite

```bash
# Verificar permissões do arquivo de banco
ls -la db/database.sqlite
# Deve ser 600 (só o dono lê/escreve)
chmod 600 db/database.sqlite

# Garantir que o arquivo não está no repositório
grep -q "*.sqlite" .gitignore && echo "✅ SQLite no gitignore" || echo "⚠️  ADICIONAR *.sqlite ao .gitignore!"
```

---

## 5. Docker — Segurança

### Dockerfile seguro (checklist)

```dockerfile
# ✅ Usar imagem base específica (nunca :latest em produção)
FROM node:20.11.0-alpine3.19

# ✅ Criar usuário não-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# ✅ Definir diretório de trabalho
WORKDIR /app

# ✅ Copiar apenas o necessário
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# ✅ Remover arquivos sensíveis que possam ter sido copiados
RUN rm -f .env .env.local .env.development

# ✅ Mudar para usuário não-root
USER appuser

# ✅ Expor apenas a porta necessária
EXPOSE 3000

CMD ["node", "server.js"]
```

### Verificações de segurança Docker

```bash
# Checar se .env está no .dockerignore
grep -q ".env" .dockerignore && echo "✅ .env no .dockerignore" || echo "⚠️  ADICIONAR .env ao .dockerignore!"

# Verificar se secrets não estão na imagem (após build)
docker history --no-trunc nome-da-imagem | grep -i "password\|secret\|token\|key" && \
  echo "⚠️  POSSÍVEL SECRET NA IMAGEM!" || echo "✅ Nenhum secret óbvio na imagem"

# Scan de vulnerabilidades (requer trivy instalado)
# trivy image nome-da-imagem
```

### .dockerignore obrigatório

```
.env
.env.*
*.sqlite
node_modules
coverage
.git
*.test.js
*.test.jsx
__tests__
```

---

## 6. Executar Tudo (Script Completo)

### package.json — scripts recomendados

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --ci --forceExit",
    "lint": "eslint src/ --ext .js,.jsx",
    "lint:security": "eslint src/ --ext .js,.jsx --rule 'security/detect-eval-with-expression: error'",
    "audit": "npm audit --audit-level=moderate",
    "security:check": "npm run lint:security && npm run audit && node scripts/check-secrets.js",
    "validate": "npm run lint && npm run test:coverage && npm run security:check"
  }
}
```

### Script de verificação rápida pré-commit

```bash
#!/bin/bash
# scripts/pre-commit-check.sh
set -e

echo "🔍 Rodando lint..."
npx eslint src/ --ext .js,.jsx

echo "🧪 Rodando testes..."
npx jest --coverage --ci

echo "🔒 Verificando secrets..."
if grep -rn --include="*.js" --include="*.jsx" -E "(password|apikey|secret)\s*=\s*['\"][^'\"]{6,}" src/; then
  echo "❌ SECRET HARDCODED DETECTADO!"
  exit 1
fi

echo "📦 Auditando dependências..."
npm audit --audit-level=moderate

echo "✅ Tudo OK! Código pronto para commit."
```

---

## 7. Analisar Código Novo

Quando o usuário colar um trecho de código novo para análise, seguir este roteiro:

### Checklist de análise (executar mentalmente ou com ferramentas)

**Segurança:**
- [ ] Existe `eval()` ou `new Function()` com entrada do usuário?
- [ ] Existe `dangerouslySetInnerHTML` sem DOMPurify?
- [ ] Existe concatenação de string em query SQL?
- [ ] Existe secret/credencial hardcoded?
- [ ] Existe `console.log` com dados sensíveis?
- [ ] Dados do usuário são validados/sanitizados antes de usar?

**Cobertura de teste:**
- [ ] A lógica principal tem teste unitário?
- [ ] Os casos de borda estão cobertos (null, undefined, string vazia, input malicioso)?
- [ ] Existe teste para o caminho de erro/exceção?

**Boas práticas React:**
- [ ] Props são validadas com PropTypes ou TypeScript?
- [ ] Efeitos colaterais estão em `useEffect`?
- [ ] Nenhum estado sensível (senha, token) está no estado do componente sem necessidade?

---

## 8. Formato de Reporte de Resultados

Ao final de qualquer análise, reportar no seguinte formato:

```
## 📊 Resultado da Análise

### 🧪 Testes
- Status: ✅ Passando / ❌ Falhando
- Cobertura: XX% (linhas) | XX% (funções) | XX% (branches)
- Testes novos necessários: [lista]

### 🔒 Segurança
- Vulnerabilidades críticas: X
- Avisos: X
- Achados: [lista com severidade]

### ✅ Ações Recomendadas
1. [ação prioritária]
2. [ação secundária]
```

---

## Referências

- Detalhes de configuração avançada: `references/advanced-config.md`
- Exemplos de ataques e como prevenir: `references/security-examples.md`
- Configuração de CI/CD com GitHub Actions: `references/ci-cd.md`
