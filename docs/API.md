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

### 6.11. `POST /api/v1/cases/:caseId/timeline/analyze`
- **Permissão Exigida:** `TIMELINE_ANALYZE` (escopado ao `caseId`)
- **Papeis Autorizados:** `ANALYST`, `LAW_ENFORCEMENT`, `CASE_MANAGER`
- **Payload:** `{}` (Corpo vazio)
- **Resposta Sucesso (`200 OK`):**
```json
{
  "data": {
    "caseId": "CASE-001",
    "status": "ANALYZED",
    "events": [
      {
        "eventId": "EVT-ME-EVENT-001",
        "caseId": "CASE-001",
        "eventType": "MISSING_EVENT",
        "label": "Missing event registered",
        "temporalExpression": {
          "precision": "EXACT",
          "isApproximate": false,
          "minUtcIso": "2026-08-30T10:00:00.000Z",
          "maxUtcIso": "2026-08-30T10:00:00.000Z"
        },
        "epistemicStatus": "CONFIRMED",
        "sourceFactIds": [],
        "sourceTipIds": [],
        "sourceEvidenceIds": [],
        "derived": false,
        "metadata": {
          "missingEventId": "EVENT-001",
          "personId": "PERSON-001"
        }
      }
    ],
    "relations": [
      {
        "leftEventId": "EVT-FACT-FACT-01",
        "rightEventId": "EVT-ME-EVENT-001",
        "relation": "BEFORE",
        "explanation": "Event EVT-FACT-FACT-01 precedes event EVT-ME-EVENT-001"
      }
    ],
    "contradictions": [],
    "gaps": [
      {
        "startEventId": "EVT-FACT-FACT-01",
        "endEventId": "EVT-ME-EVENT-001",
        "durationMinutes": 960,
        "durationDays": 0,
        "classification": "KNOWN_GAP",
        "explanation": "Chronological gap between events"
      }
    ],
    "derivations": [],
    "unresolvedEvents": []
  }
}
```

### 6.12. `POST /api/v1/cases/:caseId/entity-resolution/compare`

- **Permissão exigida:** `ENTITY_RESOLUTION_COMPARE`, escopada ao `caseId`.
- **Papéis autorizados:** `ANALYST`, `LAW_ENFORCEMENT`, `CASE_MANAGER`.
- **Privacidade:** `SEALED` falha fechado; `LAW_ENFORCEMENT_ONLY` exige autorização policial.
- **Vínculo:** ambas as pessoas precisam pertencer ao contexto analítico do caso; a principal é implícita e adicionais usam o Fact controlado documentado em `ENTITY_RESOLUTION.md`.
- **Payload:**

```json
{
  "leftPersonId": "PERSON-LEFT",
  "rightPersonId": "PERSON-RIGHT"
}
```

- **Resposta (`200 OK`), inclusive para dados insuficientes e incompatibilidade:**

```json
{
  "data": {
    "caseId": "CASE-001",
    "leftCandidateId": "PERSON-LEFT",
    "rightCandidateId": "PERSON-RIGHT",
    "conclusion": "REQUIRES_HUMAN_REVIEW",
    "comparisons": [
      {
        "attribute": "BIRTH_DATE",
        "outcome": "PARTIAL_MATCH",
        "discriminativePower": "MEDIUM",
        "contradictionSeverity": "NONE",
        "reasonCode": "BIRTH_DATE_PRECISION_CONTAINMENT",
        "sourceFactIdsLeft": ["FACT-LEFT-DOB"],
        "sourceFactIdsRight": ["FACT-RIGHT-DOB"],
        "epistemicStatusLeft": "CONFIRMED",
        "epistemicStatusRight": "UNVERIFIED"
      }
    ],
    "hardContradictions": [],
    "highDiscriminationMatches": [],
    "unknownAttributes": ["FATHER_NAME"],
    "issues": []
  }
}
```

O DTO omite intencionalmente os valores comparados. Erros esperados: `400` para payload inválido, `401` sem ator, `403` sem permissão/escopo/privacidade, `404` para entidade vinculada ausente e `422` para comparação semanticamente inválida. O endpoint não persiste resultados nem modifica entidades canônicas.
