# Fronteira HTTP e Especificação da API v1

> **Documento:** `docs/API.md`  
> **Versão:** 1.1.0 (Gate 6 — Security Foundation + RBAC + Audit Context)

---

## 1. Visão Geral e Princípios Arquiteturais

A API HTTP atua como um **Adaptador de Entrada (Inbound Adapter)** na arquitetura hexagonal da plataforma, agora acoplada a uma camada de autorização e auditoria em profundidade.

```
       +-------------------------------------------------------+
       |             HTTP Client / Frontend                    |
       +-------------------------------------------------------+
                                  |
                                  v
       +-------------------------------------------------------+
       |        Next.js App Router (src/app/api/)              |
       |        - Actor Context Resolver (x-actor-*)           |
       |        - Input Validation (Zod)                       |
       |        - Authorization Policy Engine                  |
       |        - DTO Mapping & Error Handling                 |
       +-------------------------------------------------------+
               | (Authorized)                 | (Audit Record)
               v                              v
       +-------------------------------+  +---------------------+
       |    Application Use Cases      |  |   AuditRepository   |
       |    (src/application)          |  |  (audit_events tbl) |
       +-------------------------------+  +---------------------+
               |                              ^
               v                              |
       +-------------------------------+      |
       |   Domain (src/domain) [PURO]  |      |
       +-------------------------------+      |
               |                              |
               v                              |
       +--------------------------------------+
       |   Infrastructure (src/infrastructure)|
       |   - Composition Root (AppContainer)  |
       |   - SQLite Repositories & Mappers    |
       +--------------------------------------+
```

### Regras de Ouro da API:
1. **Zero Regra de Domínio no Boundary:** A camada de API apenas valida formato/tipo e orquestra DTOs e autorizações.
2. **Deny by Default:** Requisições sem identidade válida geram `401 Unauthorized`. Atores sem permissão para o recurso/caso geram `403 Forbidden`.
3. **Auditoria Persistente e Minimizada:** Toda operação de negócio autorizada, negada ou falha gera um registro imutável em `audit_events`, sem armazenar conteúdos investigativos confidenciais.

---

## 2. Cabeçalhos de Autenticação e Contexto de Desenvolvimento

> [!WARNING]
> **RESOLVER DE DESENVOLVIMENTO (DEV/LOCAL)**  
> Durante esta fase pré-autenticação real, o contexto do ator é recebido via cabeçalhos controlados de desenvolvimento em ambientes de teste e dev:
> - `x-actor-id`: Identificador opaco do ator (ex: `OFFICER-001`, `ANALYST-001`).
> - `x-actor-roles`: Papéis do ator separados por vírgula (ex: `LAW_ENFORCEMENT`, `ANALYST`).
> - `x-actor-case-scopes`: Casos autorizados para papéis com escopo limitado (ex: `CASE-001,CASE-002`).
> - `x-actor-organization-id`: Identificador da organização de lotação.
> - `x-request-id`: Identificador de correlação de requisição.
>
> **PROTEÇÃO EM PRODUÇÃO:** Em `NODE_ENV === "production"`, estes cabeçalhos são estritamente ignorados, resultando em contexto não autenticado (`401`).

---

## 3. Padrão de Envelopes de Resposta

### 3.1. Envelope de Sucesso
Todas as respostas de sucesso retornam o objeto no campo `data`:
```json
{
  "data": {
    "sourceId": "SOURCE-TEST-001",
    "type": "OFFICIAL_RECORD",
    "label": "Civil Registry",
    "isSynthetic": false
  }
}
```

### 3.2. Envelope de Erro
Todas as respostas de erro retornam uma estrutura padronizada e sanitizada:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": [
      {
        "field": "sourceId",
        "message": "sourceId cannot be empty"
      }
    ]
  }
}
```

---

## 4. Códigos de Status HTTP e Mapeamento de Erros

| Status HTTP | Código de Erro | Origem / Causa |
| :--- | :--- | :--- |
| **`200 OK`** | — | Operação de alteração/atualização bem-sucedida (`PATCH`). |
| **`201 Created`** | — | Recurso criado com sucesso (`POST`). |
| **`400 Bad Request`** | `VALIDATION_ERROR` / `MALFORMED_JSON` | Payload JSON malformado, campo obrigatório ausente ou formato inválido (Zod). |
| **`401 Unauthorized`** | `UNAUTHENTICATED` | Requisição sem cabeçalhos de ator ou com credencial inválida. |
| **`403 Forbidden`** | `FORBIDDEN` | Ator autenticado mas sem permissão, fora do escopo do caso ou violando o nível de privacidade. |
| **`404 Not Found`** | `NOT_FOUND` | Entidade referenciada não existe (`EntityNotFoundError`). |
| **`409 Conflict`** | `CONFLICT` | Identificador duplicado (`ConflictError`). |
| **`422 Unprocessable`** | `UNPROCESSABLE_ENTITY` / `DOMAIN_INVARIANT_VIOLATION` | Violação de integridade referencial cruzada ou invariante epistêmica do Domínio. |
| **`500 Internal Error`** | `INTERNAL_ERROR` | Erro inesperado. 100% sanitizado (sem vazar stack trace, SQL ou caminhos locais). |
| **`503 Service Unavail`** | `UNREADY` | O banco de dados ou as migrações estão inacessíveis no endpoint de prontidão. |

---

## 5. Endpoints de Infraestrutura (Públicos)

### `GET /api/health`
- **Finalidade:** Liveness check rápido para verificar se o processo HTTP está respondendo. Não exige autenticação.
- **Resposta:** `200 OK`
```json
{ "status": "ok" }
```

### `GET /api/readiness`
- **Finalidade:** Readiness check para confirmar que a Composition Root está conectada ao SQLite e as migrações estão aplicadas.
- **Resposta Sucesso:** `200 OK`
```json
{ "status": "ready", "database": "ready" }
```
- **Resposta Falha:** `503 Service Unavailable`
```json
{ "status": "unready", "database": "error" }
```

---

## 6. Endpoints de Comandos (API v1 Protegida)

Todos os comandos abaixo exigem ator autenticado e permissão correspondente:

### 6.1. `POST /api/v1/sources`
- **Permissão Exigida:** `SOURCE_CREATE`
- **Payload:**
```json
{
  "sourceId": "SOURCE-001",
  "type": "OFFICIAL_RECORD",
  "label": "Delegacia de Polícia Central",
  "externalReference": "BO-2026-998811"
}
```

### 6.2. `POST /api/v1/persons`
- **Permissão Exigida:** `PERSON_CREATE`
- **Payload:**
```json
{
  "personId": "PERSON-001"
}
```

### 6.3. `POST /api/v1/missing-events`
- **Permissão Exigida:** `MISSING_EVENT_CREATE`
- **Payload:**
```json
{
  "missingEventId": "EVENT-001",
  "personId": "PERSON-001"
}
```

### 6.4. `POST /api/v1/cases`
- **Permissão Exigida:** `CASE_CREATE`
- **Payload:**
```json
{
  "caseId": "CASE-001",
  "personId": "PERSON-001",
  "missingEventId": "EVENT-001",
  "workflowStatus": "DRAFT",
  "officialStatus": "STATUS_TO_VERIFY",
  "privacyLevel": "RESTRICTED"
}
```

### 6.5. `POST /api/v1/facts`
- **Permissão Exigida:** `FACT_CREATE`
- **Payload:**
```json
{
  "factId": "FACT-001",
  "subjectId": "PERSON-001",
  "attribute": "approximateHeight",
  "value": 180,
  "epistemicStatus": "UNVERIFIED",
  "provenance": {
    "sourceId": "SOURCE-001",
    "recordedAt": "2026-08-31T10:00:00.000Z",
    "recordedBy": "OPERATOR_01"
  },
  "confidence": 0.85
}
```

### 6.6. `POST /api/v1/tips`
- **Permissão Exigida:** `TIP_CREATE` (escopado ao `caseId`)
- **Payload:**
```json
{
  "tipId": "TIP-001",
  "caseId": "CASE-001",
  "sourceId": "SOURCE-001",
  "originalText": "Avistamento próximo à rodoviária no dia 30/08 às 15h.",
  "receivedAt": "2026-08-31T10:30:00.000Z"
}
```

### 6.7. `POST /api/v1/evidence`
- **Permissão Exigida:** `EVIDENCE_CREATE` (escopado ao `caseId`)
- **Payload:**
```json
{
  "evidenceId": "EV-001",
  "caseId": "CASE-001",
  "sourceId": "SOURCE-001",
  "description": "Registro de bilhete de passagem confirmado pelo operador rodoviário.",
  "epistemicStatus": "UNVERIFIED",
  "provenance": {
    "sourceId": "SOURCE-001",
    "recordedBy": "ANALYST_01"
  }
}
```

### 6.8. `POST /api/v1/hypotheses`
- **Permissão Exigida:** `HYPOTHESIS_CREATE` (escopado ao `caseId`)
- **Payload:**
```json
{
  "hypothesisId": "HYP-001",
  "caseId": "CASE-001",
  "statement": "Pessoa embarcou em transporte intermunicipal.",
  "supportingEvidenceIds": ["EV-001"]
}
```

### 6.9. `PATCH /api/v1/cases/:caseId/workflow-status`
- **Permissão Exigida:** `CASE_WORKFLOW_UPDATE` (escopado ao `caseId`)
- **Payload:**
```json
{
  "workflowStatus": "ACTIVE"
}
```

### 6.10. `PATCH /api/v1/cases/:caseId/official-status`
- **Permissão Exigida:** `CASE_OFFICIAL_STATUS_UPDATE` (escopado ao `caseId`)
- **Payload:**
```json
{
  "officialStatus": "OFFICIALLY_MISSING",
  "provenance": {
    "sourceId": "SOURCE-001",
    "recordedBy": "POLICE_DEPT"
  }
}
```