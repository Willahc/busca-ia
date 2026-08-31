# Registro de Decisões de Arquitetura (ADRs)

> **Documento:** `docs/DECISIONS.md`  
> **Status:** Ativo

---

### ADR-001: Adoção de Next.js (App Router) + TypeScript
- **Status:** Aceito
- **Decisão:** Utilizar Next.js com TypeScript e App Router sob o diretório `src/`.

---

### ADR-002: MVP 1.0 Sem Biometria Facial Massiva
- **Status:** Aceito
- **Decisão:** Excluir expressamente do MVP 1.0 o reconhecimento facial 1:N massivo, scraping de redes sociais e varreduras de câmeras.

---

### ADR-003: Segregação Absoluta entre Dados Reais e Sintéticos
- **Status:** Aceito
- **Decisão:** Isolar de forma intransponível datasets sintéticos de fluxos reais.

---

### ADR-004: Human-in-the-Loop (HITL) Obrigatório
- **Status:** Aceito
- **Decisão:** A plataforma gera hipóteses fundamentadas, mas qualquer promoção ou encerramento exige decisão de operador humano autorizado.

---

### ADR-005: RBAC e Trilha de Auditoria Desde a Fundação
- **Status:** Aceito
- **Decisão:** Arquitetar desde a base o controle estrito de perfis e registro imutável de eventos.

---

### ADR-006: Bootstrap Local sem Dependência Obrigatória de Docker
- **Status:** Aceito
- **Decisão:** Manter bootstrap local em Node.js/npm puro.

---

### ADR-007: Domain como Núcleo Puro (Clean Architecture)
- **Status:** Aceito
- **Decisão:** O diretório `src/domain` é estritamente puro, contendo apenas TypeScript nativo.

---

### ADR-008: Scoring Multidimensional Orientado a Evidências, Discriminação e Contradições
- **Status:** Aceito
- **Decisão:** Avaliação independente de compatibilidade, poder discriminatório, confiança e contradições.

---

### ADR-009: Proveniência e Estados Epistêmicos como Requisitos Estruturais
- **Status:** Aceito
- **Decisão:** Todo atributo no sistema carrega metadados de proveniência e estado epistêmico formal.

---

### ADR-010: Application como Camada Explícita de Casos de Uso
- **Status:** Aceito
- **Decisão:** Centralizar a orquestração e fluxos de negócio em `src/application/use-cases/`.

---

### ADR-011: Modelo de Conhecimento Baseado em Fact + Provenance
- **Status:** Aceito
- **Decisão:** Adotar `Fact` como a unidade atômica de conhecimento acompanhada de `Provenance`.

---

### ADR-012: Estados Epistêmicos Não São Promovidos por Score
- **Status:** Aceito
- **Decisão:** O aumento de score de similaridade não converte `HYPOTHESIS` em `CONFIRMED`.

---

### ADR-013: Ausência de Informação é Semanticamente Neutra
- **Status:** Aceito
- **Decisão:** A ausência de um atributo significa "desconhecido", não configurando contradição.

---

### ADR-014: Workflow Interno Separado de Status Oficial
- **Status:** Aceito
- **Decisão:** Segregar estritamente o `WorkflowStatus` interno do `OfficialStatus` externo.

---

### ADR-015: Hypothesis Nunca é Equivalente a Fact
- **Status:** Aceito
- **Decisão:** Hipóteses articulam conexões probatórias, mas não se convertem diretamente em fatos.

---

### ADR-016: Application Layer como Entrada Oficial de Operações
- **Status:** Aceito
- **Decisão:** Todos os fluxos operacionais passam por casos de uso explicitamente modelados.

---

### ADR-017: Repository Ports Pertencem à Application Layer
- **Status:** Aceito
- **Decisão:** As interfaces abstratas de repositório residem em `src/application/ports/`.

---

### ADR-018: Persistência Fica Fora do Domain e da Application
- **Status:** Aceito
- **Decisão:** Nenhum código de banco de dados ou SQL reside no Domain ou Application.

---

### ADR-019: Ports Assíncronos Desde o Início
- **Status:** Aceito
- **Decisão:** Repositórios operam via `Promise<T>` assíncrona.

---

### ADR-020: Coerência Referencial Orquestrada pela Application
- **Status:** Aceito
- **Decisão:** A camada de aplicação valida ativamente a coerência referencial cruzada.

---

### ADR-021: Presentation Não Manipula Entidades de Domain Diretamente
- **Status:** Aceito
- **Decisão:** A camada de apresentação chama Use Cases e recebe DTOs.

---

### ADR-022: SQLite como Persistência Local Inicial
- **Status:** Aceito
- **Decisão:** Adotar SQLite local via `better-sqlite3` para persistência em desenvolvimento.

---

### ADR-023: Infrastructure Implementa Repository Ports da Application
- **Status:** Aceito
- **Decisão:** Adaptadores de repositório residem em `src/infrastructure/`.

---

### ADR-024: Domain e Application Permanem Agnósticos à Persistência
- **Status:** Aceito
- **Decisão:** Pureza arquitetural estrita das camadas de domínio e aplicação.

---

### ADR-025: Mappers Separam Modelos de Storage de Entidades de Domínio
- **Status:** Aceito
- **Decisão:** Mappers bi-direcionais convertem entre `Row` e `Entity`.

---

### ADR-026: Migrations Versionadas e Idempotentes
- **Status:** Aceito
- **Decisão:** Sistema de migrações SQL rastreadas em `schema_migrations`.

---

### ADR-027: Repositórios Controlam Atomicidade de Gravações Multi-Tabela
- **Status:** Aceito
- **Decisão:** Persistência relacional protegida por transações atômicas.

---

### ADR-028: Banco Local Não é Versionado no Git
- **Status:** Aceito
- **Decisão:** Arquivos `*.db` e `*.sqlite` ignorados no `.gitignore`.

---

### ADR-029: SQLite é Solução de MVP/Local, Não Decisão Definitiva de Produção
- **Status:** Aceito
- **Decisão:** SQLite suporta o desenvolvimento local; adaptadores futuros serão intercambiáveis.

---

### ADR-030: HTTP API como Inbound Adapter
- **Status:** Aceito
- **Decisão:** Route Handlers App Router atuam como adaptadores finos de entrega.

---

### ADR-031: Composition Root Centraliza Wiring de Dependências
- **Status:** Aceito
- **Decisão:** Centralizar montagem de repositórios e use cases em `AppContainer`.

---

### ADR-032: API v1 Versionada
- **Status:** Aceito
- **Decisão:** Endpoints de negócio prefixados por `/api/v1/`.

---

### ADR-033: HTTP DTOs Não Expõem Entidades de Domain Diretamente
- **Status:** Aceito
- **Decisão:** Respostas serializam DTOs planos dentro do envelope `{ data: ... }`.

---

### ADR-034: Validação de Formato no Boundary, Regras Semânticas no Domain/Application
- **Status:** Aceito
- **Decisão:** Zod valida formato/tamanho; Domínio/Aplicação validam regras epistêmicas e relacionais.

---

### ADR-035: Error Mapping HTTP Centralizado
- **Status:** Aceito
- **Decisão:** `handleHttpError` centralizado mapeia exceções para o envelope `{ error: ... }`.

---

### ADR-036: Health Separado de Readiness
- **Status:** Aceito
- **Decisão:** `/api/health` valida liveness do processo; `/api/readiness` valida conectividade do banco.

---

### ADR-037: API Sem Autenticação Restrita ao Ambiente Local Durante Esta Fase
- **Status:** Aceito
- **Decisão:** Sem endpoints de listagem sensível aberta antes do RBAC.

---

### ADR-038: Deny-by-default como Política Central de Autorização
- **Status:** Aceito
- **Contexto:** Em sistemas investigativos e de segurança pública, permitir acesso por omissão é uma vulnerabilidade inaceitável.
- **Decisão:** A política de autorização nega qualquer requisição não expressamente permitida (`DENY_BY_DEFAULT`).
- **Consequências:** Máxima proteção de dados sensíveis e eliminação de vazamentos por regras esquecidas.

---

### ADR-039: Roles e Permissions São Conceitos Separados
- **Status:** Aceito
- **Contexto:** Autorizar diretamente pelo nome de um papel (`role`) gera acoplamento rígido e código espalhado difícil de refatorar.
- **Decisão:** Atores possuem `Roles`; `Roles` concedem `Permissions`; os endpoints autorizam operações baseando-se estritamente em `Permissions`.
- **Consequências:** Flexibilidade para alterar a matriz de permissões sem modificar código de rota.

---

### ADR-040: SYSTEM_ADMIN Não Implica Acesso Investigativo
- **Status:** Aceito
- **Contexto:** Administradores de TI/Infraestrutura não devem ter acesso a conteúdos sigilosos ou poder criar hipóteses e evidências investigativas.
- **Decisão:** O papel `SYSTEM_ADMIN` concede exclusivamente `SYSTEM_ADMINISTRATION` e `AUDIT_VIEW`. Não possui permissões investigativas.
- **Consequências:** Separação estrita de poderes técnicos e de investigação policial/forense.

---

### ADR-041: Case-Scoped Authorization para Operações Sensíveis
- **Status:** Aceito
- **Contexto:** Um analista ou familiar autorizado deve acessar exclusivamente os casos formalmente designados ao seu escopo.
- **Decisão:** Operações vinculadas a um `caseId` exigem que o ator possua o caso em seu `caseScopes`, a menos que pertença a um papel com abrangência institucional explícita.
- **Consequências:** Confinamento estrito de acesso e proteção contra bisbilhotice de casos alheios.

---

### ADR-042: PrivacyLevel é Independente de Workflow/Official/Epistemic Status
- **Status:** Aceito
- **Contexto:** A classificação de sigilo de um caso é uma dimensão ortogonal ao seu andamento investigativo ou situação administrativa.
- **Decisão:** Modelar `PrivacyLevel` (`PUBLIC`, `RESTRICTED`, `CONFIDENTIAL`, `LAW_ENFORCEMENT_ONLY`, `SEALED`) como atributo próprio da entidade `Case`.
- **Consequências:** Controle fino de privacidade sem sobrecarregar enums de status operacional.

---

### ADR-043: SEALED Exige Autorização Explícita e Falha Fechada
- **Status:** Aceito
- **Contexto:** Casos sob segredo de justiça severo ou proteção extrema de testemunhas não podem ser acessados por papéis gerais.
- **Decisão:** Qualquer acesso a recurso `SEALED` falha fechado por padrão (`DENY_SEALED`), exigindo mecanismos de exceção judicial específicos.
- **Consequências:** Proteção contra vazamento acidental de medidas protetivas sigilosas.

---

### ADR-044: Audit Events Persistentes e Minimizados
- **Status:** Aceito
- **Contexto:** Todas as ações autorizadas, negadas ou falhas precisam ser registradas para conformidade e responsabilização legal.
- **Decisão:** Persistir instâncias estruturadas de `AuditEvent` na tabela `audit_events` via `SqliteAuditRepository`.
- **Consequências:** Trilha de auditoria consultável e resistente a restarts do sistema.

---

### ADR-045: Audit Não Armazena Conteúdo Investigativo
- **Status:** Aceito
- **Contexto:** A duplicação de dados sensíveis ou relatos em logs de auditoria cria vetores paralelos de vazamento de dados.
- **Decisão:** A auditoria registra metadados de ação (quem, quando, o quê, resultado), omitindo estritamente textos de relatos, descrições probatórias e valores de fatos.
- **Consequências:** Respeito à minimização de dados e segurança de denunciantes e vítimas.

---

### ADR-046: Dev Actor Resolver Proibido em Production
- **Status:** Aceito
- **Contexto:** O mecanismo de injeção de ator via cabeçalhos HTTP para desenvolvimento não pode se tornar um backdoor em produção.
- **Decisão:** Quando `NODE_ENV === "production"`, a leitura de cabeçalhos de desenvolvimento é estritamente ignorada, forçando contexto não autenticado.
- **Consequências:** Segurança absoluta contra exploração de cabeçalhos forjados em ambientes produtivos.

---

### ADR-047: Falha de Auditoria em Operação Protegida Resulta em Fail Closed
- **Status:** Aceito
- **Contexto:** Executar uma operação sensível sem conseguir registrá-la na auditoria compromete a governança forense do sistema.
- **Decisão:** Se a gravação de auditoria falhar em uma operação protegida, a requisição não finge sucesso e falha de forma segura.
- **Consequências:** Integridade intransigível da trilha de auditoria.