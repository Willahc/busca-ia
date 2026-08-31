# Arquitetura do Sistema

> **Documento:** `docs/ARCHITECTURE.md`  
> **Versão:** 1.5.0 (Gate 6 — Fundação de Segurança, RBAC e Contexto de Auditoria)

---

## 1. Visão Geral em Camadas e Boundaries

O sistema adota uma arquitetura hexagonal estritamente desacoplada (Clean Architecture / Ports & Adapters), garantindo que as regras analíticas e os fluxos de caso de uso independam de mecanismos de entrega, bancos de dados e integrações externas.

```
       +-------------------------------------------------------+
       |             HTTP Request (Clients / UI)               |
       +-------------------------------------------------------+
                                  |
                                  v
       +-------------------------------------------------------+
       |        Presentation / API (src/app/api/)              |
       |        - Actor Context Resolver (x-actor-*)           |
       |        - Input Validation (Zod)                       |
       |        - Authorization Policy Engine                  |
       |        - DTO Mappers & Error Handlers                 |
       +-------------------------------------------------------+
               | (Authorized Command)         | (Audit Entry)
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
                                  |
                                  v
                        +--------------------+
                        |  data/busca-ia.db  |
                        +--------------------+
```

### 1.1. Presentation / API (`src/app/api/`)
- Adaptador de entrada HTTP estruturado sob o Next.js App Router (`/api/v1/` e probes públicas `/api/health`, `/api/readiness`).
- Valida formato e tipos via Zod, orquestra autorização e mapeia retornos para DTOs planos.
- Para detalhes, consulte [`docs/API.md`](API.md).

### 1.2. Security (`src/security/`) — Autorização e Auditoria
- **`ActorContext`:** Identidade mínima e opaca (`actorId`, `roles`, `caseScopes`, `requestId`).
- **`RBAC`:** Separação estrita entre `Role` e `Permission` via matriz explícita (`ROLE_PERMISSIONS`).
- **`SYSTEM_ADMIN`:** Administrador técnico sem permissões investigativas ou acesso irrestrito a casos.
- **`Deny by Default`:** Qualquer contexto ou permissão não explicitamente permitida resulta em recusa imediata.
- **`Audit Context`:** Registro persistente e minimizado de todos os desfechos (`SUCCEEDED`, `DENIED`, `FAILED`).
- Para detalhes, consulte [`docs/SECURITY.md`](SECURITY.md) e [`docs/AUDIT.md`](AUDIT.md).

### 1.3. Application (`src/application/`) — Casos de Uso e Orquestração
- Orquestra fluxos investigativos, valida coerência referencial cruzada e pré-condições.
- Invoca métodos do Domínio e persiste resultados através de **Repository Ports** assíncronos.
- Para detalhes, consulte [`docs/APPLICATION_LAYER.md`](APPLICATION_LAYER.md).

### 1.4. Domain (`src/domain/`) — Núcleo Puro
- Contém entidades, agregados, objetos de valor, estados epistêmicos, níveis de privacidade (`PrivacyLevel`) e regras de invariância.
- **Isolamento Absoluto:** O domínio **não conhece** Next.js, React, bancos de dados, ORMs, Application use cases, Security, LLMs ou APIs externas.
- Para detalhes, consulte [`docs/DOMAIN_MODEL.md`](DOMAIN_MODEL.md).

### 1.5. Intelligence (`src/intelligence/`) — Adaptadores Analíticos
Implementa motores de análise especializados via adaptadores desacoplados (Entity Resolution, Temporal, Geospatial, Scoring, Graph, NLP).

### 1.6. Infrastructure (`src/infrastructure/`) — Persistência e Composition Root
- Implementa as interfaces de portas (`*Repository`, `AuditRepository`) definidas na aplicação e segurança.
- Centraliza o container de dependências (`AppContainer`) na Composition Root (`src/infrastructure/composition/`).
- Gerencia conexões SQLite (`better-sqlite3`), mappers bi-direcionais, migrações versionadas (`001-initial-schema`, `002-security-audit`, `003-case-privacy-level`) e transações atômicas.
- Para detalhes, consulte [`docs/PERSISTENCE.md`](PERSISTENCE.md).

---

## 2. Modelo de Conhecimento e Proveniência

Cada registro ou atributo relevante no sistema carrega metadados formais de conhecimento:
- **`value`**: O valor ou dado em si.
- **`status`**: O estado epistêmico do dado (`CONFIRMED`, `DERIVED`, `UNVERIFIED`, `HYPOTHESIS`, `SYNTHETIC`).
- **`source`**: A fonte formal da informação.
- **`observedAt`**: Data/hora da observação no mundo real.
- **`recordedAt`**: Data/hora do registro no sistema.
- **`confidence`**: Grau de confiança técnica na captura ou fonte.
- **`provenance`**: Rastro completo de origem e método de obtenção.
- **`recordedBy`**: Identificador do usuário, sistema ou sensor que registrou o dado.

---

## 3. Invariantes de Domínio e Segurança

1. **Invariante de Segregação Sintética:** `SYNTHETIC` jamais pode ser promovido para `CONFIRMED` ou `DERIVED` de forma silenciosa ou automática.
2. **Invariante de Hipótese:** Um registro `HYPOTHESIS` não se transforma em `CONFIRMED` apenas porque seu score analítico aumentou.
3. **Invariante de Rastreabilidade Derivada:** Qualquer dado `DERIVED` deve obrigatoriamente manter referências explícitas aos dados primários dos quais foi gerado (`parentFactIds`).
4. **Invariante de Exibição:** Dados `UNVERIFIED` ou `HYPOTHESIS` nunca podem ser exibidos como fatos confirmados.
5. **Invariante de Deny by Default:** Toda operação protegida não explicitamente autorizada deve ser sumariamente negada.
6. **Invariante de Isolamento do Admin:** `SYSTEM_ADMIN` não possui privilégio investigativo ou de alteração de conteúdo de casos.
7. **Invariante de Minimização da Auditoria:** Eventos de auditoria registram metadados de ação, jamais conteúdos probatórios sensíveis ou relatos brutos.