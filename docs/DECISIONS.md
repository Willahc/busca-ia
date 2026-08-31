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

---

### ADR-048: Camada Dedicada de Inteligência Temporal Isolada
- **Status:** Aceito
- **Contexto:** Motores analíticos de inteligência não pertencem ao modelo canônico de domínio nem à infraestrutura ou API.
- **Decisão:** Criar a camada `src/intelligence/temporal/` contendo motores determinísticos, puros e sem efeitos colaterais.
- **Consequências:** Alto desacoplamento, testabilidade estrita e ausência de dependências de framework dentro dos motores.

---

### ADR-049: Invariante Epistêmica da Ausência de Informação Temporal
- **Status:** Aceito
- **Contexto:** No contexto de pessoas desaparecidas, a falta de registros ou a existência de grandes intervalos cronológicos é uma condição comum de investigação, e não inconsistência lógica.
- **Decisão:** Ausência de dados temporais e lapsos cronológicos (`gaps`) são epistemicamente neutros e NUNCA disparam contradições lógicas.
- **Consequências:** Eliminação total de falsos positivos na avaliação de consistência cronológica.

---

### ADR-050: Modelagem Explícita de Precisão Temporal Multi-Escala
- **Status:** Aceito
- **Contexto:** Projetar expressões parciais ("agosto de 2026") como objetos `Date` (`2026-08-01T00:00:00Z`) forja precisão inexistente e causa desvios de fuso horário.
- **Decisão:** Implementar `TemporalPrecision` (`EXACT`, `DAY`, `MONTH`, `YEAR`, `APPROXIMATE`, `INTERVAL`, `UNKNOWN`), `TemporalPoint` e `TemporalInterval` que mantêm o nível de granularidade nativo.
- **Consequências:** Fidelidade aos dados de origem e eliminação de artefatos de fuso horário.

---

### ADR-051: Relações Temporais Determinísticas de Intervalos
- **Status:** Aceito
- **Contexto:** Comparar eventos investigativos com diferentes precisões requer álgebra temporal estruturada.
- **Decisão:** Implementar `TemporalRelationEvaluator` que classifica pares em `BEFORE`, `AFTER`, `EQUAL`, `OVERLAPS`, `CONTAINS`, `CONTAINED_BY` ou `INDETERMINATE`.
- **Consequências:** Análise cronológica formal, reprodutível e independente de heurísticas probabilísticas.

---

### ADR-052: Separação Estrita entre Data de Ingestão e Data de Ocorrência
- **Status:** Aceito
- **Contexto:** Denúncias (`Tip.receivedAt`) e evidências (`Evidence.recordedAt`) marcam quando o dado entrou no sistema, não quando o evento relatado ocorreu no mundo físico.
- **Decisão:** `TimelineBuilder` classifica explicitamente eventos de recepção e custódia sem projetá-los como observações de fatos primários.
- **Consequências:** Proteção contra confusão entre tempo do relato e tempo do fato.

---

### ADR-053: Teto de Precisão em Derivações Temporais
- **Status:** Aceito
- **Contexto:** Derivar durações ou intervalos entre eventos com diferentes precisões não pode amplificar a certeza cronológica.
- **Decisão:** A precisão do resultado derivado pelo `TemporalDerivationEngine` é limitada ao menor grau de precisão (`coarsest input precision`) entre os termos participantes.
- **Consequências:** Proibição de inventar minutos ou segundos a partir de datas imprecisas.

---

### ADR-054: Regras Explícitas e Controladas de Contradição Temporal
- **Status:** Aceito
- **Contexto:** Contradições não devem ser inferidas por similaridade ou divergências pontuais irrelevantes.
- **Decisão:** Avaliar contradições temporais estritamente por regras determinísticas declaradas: `EXACT_TIMESTAMP_CONFLICT`, `NON_OVERLAPPING_EXCLUSIVE_INTERVALS` e `IMPOSSIBLE_SEQUENCE`.
- **Consequências:** Clareza, auditabilidade e rastreabilidade total das causas de conflito temporal.

---

### ADR-055: Fail-Closed e Escopo de Caso na Análise de Linha do Tempo
- **Status:** Aceito
- **Contexto:** A análise temporal consolida toda a inteligência do caso e deve obedecer à política de segurança restrita.
- **Decisão:** Proteger `POST /api/v1/cases/[caseId]/timeline/analyze` com permissão `TIMELINE_ANALYZE`, restrição por escopo de caso para analistas e bloqueio de casos `SEALED`.
- **Consequências:** Impossibilidade de acesso não autorizado à linha do tempo analítica.

---

### ADR-056: Otimização de Consultas Temporais via Índices SQLite
- **Status:** Aceito
- **Contexto:** A recuperação de todos os fatos, relatos, evidências e hipóteses associados a um caso exige buscas rápidas por chaves estrangeiras.
- **Decisão:** Adicionar índices na migração `004-temporal-query-indexes.sql` para `facts(subject_id)`, `tips(case_id)`, `evidence(case_id)` e `hypotheses(case_id)`.
- **Consequências:** Execução rápida da montagem da timeline sem degradação em bases crescentes.

---

### ADR-057: Entity Resolution is Analytical and Non-Authoritative
- **Status:** Aceito
- **Decisão:** O motor produz avaliações analíticas determinísticas e nunca uma decisão autoritativa de identidade.

### ADR-058: Compatibility Never Equals Identity Confirmation
- **Status:** Aceito
- **Decisão:** `COMPATIBLE` descreve apenas regras de compatibilidade satisfeitas e jamais confirma que dois registros são a mesma pessoa.

### ADR-059: Missing Attributes are UNKNOWN, not MATCH or Contradiction
- **Status:** Aceito
- **Decisão:** Atributos ausentes ou inválidos resultam em `UNKNOWN`, semanticamente neutro.

### ADR-060: Discriminative Power is Categorical, not Numerical
- **Status:** Aceito
- **Decisão:** Poder discriminativo usa `LOW`, `MEDIUM`, `HIGH` e `VERY_HIGH`, sem pesos, soma ou média.

### ADR-061: Hard Contradictions can Invalidate Compatibility
- **Status:** Aceito
- **Decisão:** Uma regra explícita `HARD` leva a `INCOMPATIBLE`; no Gate 8, a regra é conflito entre datas exatas confirmadas.

### ADR-062: Attribute Assertions Preserve Epistemic Status and Provenance
- **Status:** Aceito
- **Decisão:** Cada assertion preserva `FactId`, `SourceId` e estado epistêmico, sem promoção automática.

### ADR-063: Multiple Assertions are not Silently Collapsed
- **Status:** Aceito
- **Decisão:** Todas as assertions participam da avaliação; conflitos internos confirmados são issues explícitas.

### ADR-064: Entity Resolution does not Auto-Merge Persons
- **Status:** Aceito
- **Decisão:** A comparação não altera nem mescla `Person`, `Fact` ou `Case`.

### ADR-065: No Global Entity Resolution Score in Gate 8
- **Status:** Aceito
- **Decisão:** O resultado lista evidências e contradições categóricas sem valor agregado ou probabilidade global.

### ADR-066: Pairwise Comparison Only in Gate 8
- **Status:** Aceito
- **Decisão:** Cada execução compara um único par autorizado; não há varredura global ou matching `N x N`.

### ADR-067: ENTITY_RESOLUTION_COMPARE Requires Investigative Authorization and Case Scope
- **Status:** Aceito
- **Decisão:** A operação exige permissão investigativa explícita, escopo de caso e política de privacidade; `SYSTEM_ADMIN` não a recebe.
