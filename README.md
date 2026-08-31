# Plataforma de Inteligência para Pessoas Desaparecidas

> **Status:** Fundação Técnica (Gate 1) — Ambiente Local em Construção.

---

## 1. Propósito

A **Plataforma de Inteligência para Pessoas Desaparecidas** é concebida como uma camada analítica complementar para auxiliar investigações de desaparecimento. O sistema visa estruturar, correlacionar e contextualizar informações dispersas e heterogêneas (relatos, avistamentos, dados institucionais, registros descritivos e eventos temporais/espaciais), transformando dados fragmentados em hipóteses investigáveis auditáveis.

A plataforma não substitui a atuação de órgãos oficiais (Polícia, Ministério Público, Sinesp, SINALID, PLID, hospitais, assistência social ou ONGs), mas atua como suporte à decisão de equipes autorizadas.

---

## 2. Tese Central

> **Este produto NÃO é "uma IA que encontra pessoas".**
> **Este produto É uma plataforma de inteligência analítica para casos de desaparecimento.**

O objetivo tecnológico é transformar **informação fragmentada** em **hipóteses investigáveis priorizadas**.
A plataforma não responde de forma autônoma *"Encontramos João"*, mas sim:
*"Existem registros independentes que justificam investigação prioritária sob os critérios X, Y e Z."*

A decisão final pertence exclusivamente a um operador humano autorizado.

---

## 3. Princípios Fundamentais

1. **Auditabilidade > Conveniência:** Cada inferência, transição de estado ou classificação deve manter rastro completo de auditoria.
2. **Explicabilidade > Score Bonito:** Nenhum score numérico opaco deve substituir a justificação detalhada dos fatores de suporte e contradição.
3. **Evidência > Intuição:** Fatos requerem sustentação e proveniência identificada.
4. **Segurança > Feature:** Proteção de pessoas vulneráveis contra abusos, perseguição e vazamento de dados.
5. **Proveniência > Automação:** Todo dado possui origem, método de aquisição e estado epistêmico explícito.
6. **Human Review > Decisão Automática:** Automações apoiam a análise; jamais fecham diagnósticos ou determinam ações sem revisão humana.

---

## 4. Previsto para o MVP 1.0 (Construção Incremental por Gates)

A evolução da plataforma contemplará os seguintes módulos em etapas graduais:

- **Case Management:** Estruturação canônica de Casos, Pessoas e Eventos de Desaparecimento.
- **Pistas e Evidências:** Gestão de relatos, registros, fontes e metadados de custódia investigativa.
- **Linha do Tempo e Análise Temporal:** Consistência temporal, plausibilidade de movimentação e identificação de janelas críticas.
- **Resolução de Entidades (Entity Resolution):** Identificação de potenciais correspondências entre registros sob incerteza descritiva.
- **Motor de Scoring Explicável:** Avaliação multidimensional baseada em compatibilidade, poder discriminatório, confiança na fonte, corroboração, contradições e ganho de informação.
- **Inteligência Geoespacial:** Relações espaciais plausíveis sem fabricação de rotas especulativas.
- **Inteligência em Grafos:** Conexões relacionais entre casos, locais, entidades e pistas.
- **RBAC, Antiabuso e Auditoria:** Controle estrito de perfis de acesso, minimização de privilégios e registro imutável de eventos.
- **Case Copilot:** Assistência de linguagem natural para explorar lacunas e contradições do caso sem transformar inferência em fato.

---

## 5. Fora de Escopo

Estão expressamente **fora de escopo** do MVP 1.0:
- Reconhecimento facial massivo 1:N na internet.
- Scraping ou varredura de redes sociais.
- Varredura indiscriminada de câmeras públicas ("caça de rostos").
- Tomada de decisão investigativa automatizada.
- Acesso público a pistas internas, localizações ou rotas investigativas.
- Mistura não rastreada entre dados de teste/simulação e dados reais.

---

## 6. Human-in-the-Loop (HITL) Obrigatório

A supervisão humana é requisito arquitetural intransigível. O sistema opera como ferramenta de apoio cognitivo:
- Hipóteses investigativas exigem validação de um analista.
- Mudanças de status de candidatos ou evidências dependem de revisão formal.
- O sistema destaca inconsistências e contradições para análise do investigador.

---

## 7. Segurança, Privacidade e Antiabuso

O produto lida com pessoas em potencial estado de vulnerabilidade extrema (incluindo vítimas de violência doméstica, testemunhas protegidas e situações de risco familiar). Por princípio:
- **Proteção Ativa:** Ninguém tem direito presumido de localização apenas por solicitar uma busca.
- **Camada Cidadã Restrita:** O público geral não tem acesso a hipóteses, dados de denunciantes, rotas ou informações sensíveis.
- **Minimização de Acesso (Least Privilege):** Cada perfil (Público, Analista, Assistência Social, Autoridade Policial, Administrador) acessa estritamente o necessário para seu papel regulamentar.

---

## 8. Segregação entre Dados Reais e Sintéticos

Dados reais e dados sintéticos/simulados **jamais se misturam silenciosamente**.
- Dados sintéticos operam sob prefixos/identificadores dedicados (ex: `SIM-TIP-001`, `SIM-CANDIDATE-001`).
- Um dado sintético nunca é promovido a confirmado.
- Toda simulação analítica ou de benchmark é claramente isolada dos registros investigativos reais.

---

## 9. Arquitetura de Diretórios

O projeto segue estrita separação de responsabilidades:

```
src/
  app/                     # Presentation / Rotas Next.js (App Router)
  components/              # Componentes de interface compartilhados
  application/             # Camada de Aplicação (Casos de Uso e Orquestração)
  domain/                  # Núcleo de Domínio Puro (Sem dependências externas)
  intelligence/            # Módulos e Adaptadores de Inteligência Analítica
    entity-resolution/     # Resolução de entidades e reconciliação
    temporal/              # Inteligência temporal e plausibilidade
    geospatial/            # Inteligência geoespacial
    scoring/               # Motor de scoring multidimensional
    graph/                 # Grafos de relacionamento e conectividade
    nlp/                   # Processamento de linguagem natural de relatos
  security/                # Políticas de segurança, RBAC e auditoria
  infrastructure/          # Adaptadores de infraestrutura e persistência
  shared/                  # Tipos, contratos e utilitários transversais puros

docs/                      # Documentação técnica, arquitetura e ADRs
tests/                     # Testes unitários, de integração e de domínio
synthetic-data/            # Datasets sintéticos isolados para testes e benchmarks
Arquivos/                  # Diretório local preexistente (preservado)
Imagens/                   # Diretório local preexistente (preservado)
```

---

## 10. API HTTP Local e Fundação de Segurança (Gates 5 e 6)

A plataforma dispõe de uma fronteira HTTP operacional estruturada no Next.js App Router (`/api/v1/`), protegida por controle de acesso baseado em papéis e permissões (RBAC), escopos de caso e níveis de privacidade (`PrivacyLevel`), integrada a uma trilha de auditoria persistente (`audit_events`):

- **Health Probe (Pública):** `GET /api/health`
- **Readiness Probe (Operacional):** `GET /api/readiness`
- **Comandos Protegidos (v1 com RBAC e Auditoria):**
  - `POST /api/v1/sources` (`SOURCE_CREATE`)
  - `POST /api/v1/persons` (`PERSON_CREATE`)
  - `POST /api/v1/missing-events` (`MISSING_EVENT_CREATE`)
  - `POST /api/v1/cases` (`CASE_CREATE`)
  - `POST /api/v1/facts` (`FACT_CREATE`)
  - `POST /api/v1/tips` (`TIP_CREATE`, escopado ao caso)
  - `POST /api/v1/evidence` (`EVIDENCE_CREATE`, escopado ao caso)
  - `POST /api/v1/hypotheses` (`HYPOTHESIS_CREATE`, escopado ao caso)
  - `PATCH /api/v1/cases/:caseId/workflow-status` (`CASE_WORKFLOW_UPDATE`, escopado ao caso)
  - `PATCH /api/v1/cases/:caseId/official-status` (`CASE_OFFICIAL_STATUS_UPDATE`, escopado ao caso)
  - `POST /api/v1/cases/:caseId/timeline/analyze` (`TIMELINE_ANALYZE`, escopado ao caso)

### Documentação Técnica de Referência:
- [`docs/TEMPORAL_INTELLIGENCE.md`](docs/TEMPORAL_INTELLIGENCE.md) — Reconstrução de linha do tempo, precisão multi-escala, relações de Allen, gaps e contradições controladas.
- [`docs/SECURITY.md`](docs/SECURITY.md) — Modelo de ameaças, papéis, permissões, níveis de privacidade e deny-by-default.
- [`docs/AUDIT.md`](docs/AUDIT.md) — Trilha de auditoria persistente e princípio de minimização de dados.
- [`docs/API.md`](docs/API.md) — Especificação completa de contratos de endpoints, esquemas Zod e envelopes DTO.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — 56 Registros de Decisões de Arquitetura (ADR-001 a ADR-056).

