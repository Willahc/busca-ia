# Fronteira HTTP e Especificação da API v1

> **Documento:** `docs/API.md`  
> **Versão:** 1.0.0 (Gate 5 — API Boundary + Composition Root)

---

## 1. Visão Geral e Princípios Arquiteturais

A API HTTP atua como um **Adaptador de Entrada (Inbound Adapter)** na arquitetura hexagonal da plataforma.

```
       +-------------------------------------------------------+
       |             HTTP Client / Frontend                    |
       +-------------------------------------------------------+
                                  |
                                  v
       +-------------------------------------------------------+
       |        Next.js App Router (src/app/api/)              |
       |        - Input Validation (Zod)                       |
       |        - DTO Mapping                                  |
       |        - HTTP Error Mapping                           |
       +-------------------------------------------------------+
                                  |
                                  v
       +-------------------------------------------------------+
       |        Application Use Cases (src/application)        |
       +-------------------------------------------------------+
                                  |
                                  v
       +-------------------------------------------------------+
       |               Domain (src/domain) [PURO]              |
       +-------------------------------------------------------+
                                  |
                                  v
       +-------------------------------------------------------+
       |             Ports (src/application/ports)             |
       +-------------------------------------------------------+
                                  ^ (implementa portas)
       +-------------------------------------------------------+
       |        Infrastructure (src/infrastructure)            |
       |        - Composition Root (AppContainer)              |
       |        - SQLite Repositories & Mappers                |
       +-------------------------------------------------------+
```

### Regras de Ouro da API:
1. **Zero Regra de Domínio:** A camada de API apenas valida formato/tipo e orquestra DTOs. Decisões epistêmicas e invariantes residem exclusivamente no Domínio e na Aplicação.
2. **Composition Root Obrigatória:** Route Handlers **nunca** instanciam repositórios SQLite ou criam conexões de banco de dados diretamente; tudo é resolvido via `getApplicationContainer()`.
3. **Foco em Comandos:** Neste gate, a API implementa apenas comandos operacionais (`POST`/`PATCH`). Não há endpoints de listagem em massa (`GET /cases`, `GET /persons`) para evitar exposição de dados sensíveis antes da introdução de autenticação e RBAC.

---

## 2. Aviso de Segurança e Escopo

> [!WARNING]
> **API RESTRITA AO AMBIENTE LOCAL DE DESENVOLVIMENTO (DEV/LOCAL)**  
> Esta versão da API **não possui autenticação nem controle de acesso (RBAC)**. Ela é destinada exclusivamente a testes locais e desenvolvimento sob a premissa de *zero trust*. **NÃO deve ser exposta publicamente ou utilizada em produção sem a camada de segurança (Gate 6).**

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
| **`404 Not Found`** | `NOT_FOUND` | Entidade referenciada não existe (`EntityNotFoundError`). |
| **`409 Conflict`** | `CONFLICT` | Identificador duplicado (`ConflictError`). |
| **`422 Unprocessable`** | `UNPROCESSABLE_ENTITY` / `DOMAIN_INVARIANT_VIOLATION` | Violação de integridade referencial cruzada ou invariante epistêmica do Domínio. |
| **`500 Internal Error`** | `INTERNAL_ERROR` | Erro inesperado. A resposta é 100% sanitizada, sem vazar stack trace, SQL ou caminhos locais. |
| **`503 Service Unavail`** | `UNREADY` | O banco de dados ou as migrações estão inacessíveis no endpoint de prontidão. |

---

## 5. Endpoints de Infraestrutura

### `GET /api/health`
- **Finalidade:** Liveness check rápido para verificar se o processo HTTP está respondendo. Não toca no banco de dados.
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

## 6. Endpoints de Comandos (API v1)

### 6.1. `POST /api/v1/sources`
Registra uma nova fonte formal de informação.
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
Registra uma identidade investigativa (permite perfil inicial incompleto).
- **Payload:**
```json
{
  "personId": "PERSON-001"
}
```

### 6.3. `POST /api/v1/missing-events`
Registra o evento de desaparecimento vinculado a uma `Person` existente.
- **Payload:**
```json
{
  "missingEventId": "EVENT-001",
  "personId": "PERSON-001"
}
```

### 6.4. `POST /api/v1/cases`
Cria o agregado de Caso investigativo, garantindo coerência referencial entre `Person` e `MissingEvent`.
- **Payload:**
```json
{
  "caseId": "CASE-001",
  "personId": "PERSON-001",
  "missingEventId": "EVENT-001",
  "workflowStatus": "DRAFT",
  "officialStatus": "STATUS_TO_VERIFY"
}
```

### 6.5. `POST /api/v1/facts`
Registra um fato com proveniência completa e rastreabilidade de fatos ancestrais.
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
Registra relato público preservando o texto original (`originalText`) de forma estritamente intacta.
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
Registra achado probatório sem confirmação automática de hipótese.
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
Registra uma hipótese investigativa com referências opcionais a evidências de suporte e refutação.
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
Altera exclusivamente o status operacional interno (`DRAFT`, `ACTIVE`, `SUSPENDED`, `CLOSED`), preservando o status oficial.
- **Payload:**
```json
{
  "workflowStatus": "ACTIVE"
}
```

### 6.10. `PATCH /api/v1/cases/:caseId/official-status`
Atualiza exclusivamente o status administrativo/oficial perante as autoridades (`OFFICIALLY_MISSING`, `OFFICIALLY_LOCATED`, `STATUS_TO_VERIFY`, `UNKNOWN`), preservando o workflow interno.
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

---

## 7. Limites de Tamanho de Campos

Para prevenir ataques de negação de serviço e payloads desproporcionais, os seguintes limites estritos são impostos:
- **`originalText`**: Máximo de 10.000 caracteres.
- **`description` / `statement`**: Máximo de 5.000 caracteres.
- **`label` / `externalReference` / `note`**: Máximo de 500 a 2.000 caracteres.
- **`sourceId` / `personId` / `caseId` / etc.**: Máximo de 128 caracteres.