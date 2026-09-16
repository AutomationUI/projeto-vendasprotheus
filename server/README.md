# VendasProtheus — BFF (Backend for Frontend)

Servidor Node.js **stateless** que atua como proxy entre o frontend React e as APIs REST do Protheus, com serviços de valor agregado para envio de orçamentos por email e WhatsApp.

## Arquitetura BFF

```
React (8080)  ──►  Node/Express BFF (3001)  ──►  Protheus REST API
                       │
                       ├── Proxy: repassa chamadas ao Protheus (Basic Auth)
                       ├── Email: Nodemailer (SMTP)
                       └── WhatsApp: Meta Cloud API v21.0
```

O BFF **não possui banco de dados local**. Toda a lógica de negócio e persistência ficam no Protheus.

```
src/
├── index.ts                  ← Entry point + graceful shutdown
├── app.ts                    ← Express factory (testável isoladamente)
├── config/env.ts             ← Validação de .env com Zod
├── lib/
│   ├── logger.ts             ← Pino (JSON em prod, pretty em dev)
│   └── protheus-client.ts    ← HTTP client para APIs REST do Protheus
├── middleware/
│   ├── api-key.ts            ← Autenticação por API key
│   ├── error-handler.ts      ← Handler global de erros
│   ├── rate-limiter.ts       ← express-rate-limit por IP
│   ├── request-id.ts         ← X-Request-Id para rastreabilidade
│   └── validator.ts          ← Validação Zod genérica
├── schemas/                  ← Schemas Zod para request bodies
├── controllers/              ← Extrai dados → chama service → responde
├── services/                 ← Email, WhatsApp, delivery log (in-memory)
├── routes/                   ← Monta middleware + controller
└── types/                    ← Interfaces compartilhadas
```

## Pré-requisitos

- Node.js >= 18
- npm >= 9
- Acesso à API REST do Protheus (URL, usuário e senha)

## Setup local

```bash
# 1. Instalar dependências
cd server
npm install

# 2. Copiar e configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com credenciais do Protheus, SMTP, API_KEY, etc.

# 3. Gerar uma API key segura
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Cole o resultado em API_KEY no .env

# 4. Iniciar em desenvolvimento
npm run dev
```

O servidor inicia em `http://localhost:3001` (stateless — sem banco de dados local).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NODE_ENV` | Não | `development` \| `production` \| `test` (default: development) |
| `PORT` | Não | Porta do servidor (default: 3001) |
| `API_KEY` | **Sim** | Chave de autenticação para rotas protegidas |
| `FRONTEND_URL` | Não | URL do frontend para links de aprovação |
| `CORS_ORIGIN` | Não | Origens permitidas (separar por vírgula) |
| `PROTHEUS_BASE_URL` | **Sim** | URL base da API REST do Protheus |
| `PROTHEUS_USER` | **Sim** | Usuário para autenticação Basic Auth |
| `PROTHEUS_PASS` | **Sim** | Senha para autenticação Basic Auth |
| `PROTHEUS_TENANT_ID` | Não | Tenant ID do Protheus (default: 01) |
| `SMTP_HOST` | **Sim** | Host do servidor SMTP |
| `SMTP_PORT` | Não | Porta SMTP (default: 587) |
| `SMTP_SECURE` | Não | TLS direto (default: false) |
| `SMTP_USER` | **Sim** | Usuário SMTP |
| `SMTP_PASS` | **Sim** | Senha SMTP |
| `SMTP_FROM_NAME` | Não | Nome do remetente (default: VendasProtheus) |
| `SMTP_FROM_EMAIL` | **Sim** | Email do remetente |
| `WHATSAPP_PHONE_NUMBER_ID` | Não | ID do número WhatsApp Business |
| `WHATSAPP_ACCESS_TOKEN` | Não | Token da Meta Cloud API |

## Endpoints

### Health (sem autenticação)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/health` | Liveness check |
| GET | `/api/v1/ready` | Readiness check (Protheus, SMTP) |

### Quotes (sem autenticação — acesso público para aprovação)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/v1/quotes/:id/approve` | Aprovar orçamento |
| POST | `/api/v1/quotes/:id/reject` | Rejeitar orçamento (body: `{ reason }`) |
| GET | `/api/v1/quotes/:id/status` | Status de aprovação |

### Messaging (requer header `X-Api-Key`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/v1/messaging/send-email` | Enviar orçamento por email |
| POST | `/api/v1/messaging/send-whatsapp` | Enviar orçamento por WhatsApp |
| POST | `/api/v1/messaging/test-email` | Testar configuração SMTP |
| POST | `/api/v1/messaging/test-whatsapp` | Testar configuração WhatsApp |
| GET | `/api/v1/messaging/delivery-log` | Log de envios recentes |
| GET | `/api/v1/messaging/delivery-log/:quoteId` | Log de envios por orçamento |
| GET | `/api/v1/messaging/settings` | Configurações (credenciais mascaradas) |

## Autenticação

Rotas sob `/api/v1/messaging` exigem o header:

```
X-Api-Key: sua-chave-api-aqui
```

Rotas de health e quotes são públicas (quotes permitem aprovação de clientes via link).

## Segurança

- **Helmet**: Headers de segurança HTTP (X-Content-Type-Options, X-Frame-Options, etc.)
- **Rate Limiting**: 60 req/min por IP (configurável)
- **API Key**: Autenticação para rotas administrativas
- **Zod Validation**: Validação de todos os inputs (body, params, query)
- **CORS**: Origens restritas ao frontend configurado
- **Body Limit**: 10MB máximo (suficiente para PDFs de orçamento)
- **Request ID**: Rastreabilidade de cada requisição via `X-Request-Id`

## Observabilidade

- **Pino Logger**: Logs JSON estruturados em produção, pretty em desenvolvimento
- **Request Logging**: Método, URL, status, duração de cada request
- **Health Check**: Endpoint `/api/v1/health` para monitoramento
- **Readiness Check**: Endpoint `/api/v1/ready` verifica Protheus e SMTP

## Build e produção

```bash
# Build TypeScript
npm run build

# Executar em produção
NODE_ENV=production node dist/index.js
```

## Deploy com Docker

```bash
# Build da imagem
docker build -t vendasprotheus-bff .

# Executar
docker run -d \
  --name vendasprotheus-bff \
  -p 3001:3001 \
  --env-file .env \
  vendasprotheus-bff
```

O `Dockerfile` usa:
- **Multi-stage build**: Imagem final ~150MB (node:22-slim)
- **Non-root user**: Roda como `appuser` (UID 1001)
- **dumb-init**: PID 1 correto para signals
- **HEALTHCHECK**: Monitoramento nativo Docker
- **Stateless**: Sem volumes — todo estado vive no Protheus

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Desenvolvimento com hot-reload (tsx watch) |
| `npm run build` | Compilar TypeScript para `dist/` |
| `npm start` | Executar build de produção |
| `npm run typecheck` | Verificação de tipos sem emitir arquivos |
