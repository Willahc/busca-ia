# Registro de Decisões de Arquitetura (ADRs)

> **Documento:** `docs/DECISIONS.md`  
> **Status:** Ativo

---

### ADR-001: Adoção de Next.js (App Router) + TypeScript
- **Status:** Aceito
- **Contexto:** Necessidade de um ecossistema tipado ponta a ponta, com renderização modular, robustez para interface analítica e capacidade de evolução incremental.
- **Decisão:** Utilizar Next.js com TypeScript e App Router, estruturado sob o diretório `src/`.
- **Consequências:** Garante segurança de tipos estática, compilação consistente e flexibilidade para apresentação e APIs internas.

---

### ADR-002: MVP 1.0 Sem Biometria Facial Massiva
- **Status:** Aceito
- **Contexto:** Riscos severos de falsos positivos, viés algorítmico, scraping ilegal de imagens e questões ético-jurídicas no tratamento de dados biométricos sensíveis.
- **Decisão:** Excluir expressamente do MVP 1.0 o reconhecimento facial 1:N massivo, scraping de redes sociais e varreduras de câmeras. Focar em correlações descritivas, temporais, geoespaciais e de grafos.
- **Consequências:** O sistema prioriza inteligência estruturada, respeito regulatório (LGPD) e redução de alucinações biométricas.

---

### ADR-003: Segregação Absoluta entre Dados Reais e Sintéticos
- **Status:** Aceito
- **Contexto:** O projeto envolve investigação de casos humanos reais e simulações analíticas de benchmark. O risco de contaminação cruzada pode gerar falsas esperanças a famílias ou desvio de recursos policiais.
- **Decisão:** Isolar de forma intransponível datasets sintéticos (`synthetic-data/`, prefixos `SIM-`) de fluxos reais. Nenhum dado sintético pode ser promovido silenciosamente para confirmado.
- **Consequências:** Segurança analítica e proteção contra contaminação de bases reais.

---

### ADR-004: Human-in-the-Loop (HITL) Obrigatório
- **Status:** Aceito
- **Contexto:** A automação plena em investigações de desaparecimento é perigosa e irresponsável.
- **Decisão:** A plataforma gera hipóteses fundamentadas e ranqueadas, mas qualquer promoção, arquivamento ou conclusão exige decisão deliberada de operador humano autorizado.
- **Consequências:** A plataforma atua estritamente como sistema de apoio à decisão investigativa.

---

### ADR-005: RBAC e Trilha de Auditoria Desde a Fundação
- **Status:** Aceito
- **Contexto:** Dados de desaparecimento envolvem segredo investigativo, vulnerabilidade familiar e risco de violência doméstica ou perseguição.
- **Decisão:** Arquitetar desde a base o controle estrito de perfis (Least Privilege) e o registro imutável de todas as ações analíticas (quem visualizou, quem promoveu, qual hipótese, qual justificativa).
- **Consequências:** Proteção ativa das vítimas e conformidade legal e forense.

---

### ADR-006: Bootstrap Local sem Dependência Obrigatória de Docker
- **Status:** Aceito
- **Contexto:** O desenvolvimento inicial e os testes de domínio devem ser ágeis, executáveis localmente em ambientes de desenvolvimento (Windows/Linux/macOS) sem sobrecarga de contêineres desnecessários na fase de fundação.
- **Decisão:** Manter o bootstrap local em Node.js/npm puro, introduzindo Docker apenas quando a infraestrutura de persistência real for selecionada em gates futuros.
- **Consequências:** Setup simplificado, ciclos rápidos de feedback e redução de atrito no desenvolvimento local.

---

### ADR-007: Domain como Núcleo Puro (Clean Architecture)
- **Status:** Aceito
- **Contexto:** Acoplamento prematuro com bibliotecas externas, ORMs, bancos ou Next.js polui a lógica analítica e dificulta testes unitários determinísticos.
- **Decisão:** O diretório `src/domain` será estritamente puro, contendo apenas TypeScript nativo, sem conhecer banco, Next.js, React, ORM ou provedores externos de IA.
- **Consequências:** Domínio testável em milissegundos, regras de negócio blindadas contra mudanças de framework ou infraestrutura.

---

### ADR-008: Scoring Multidimensional Orientado a Evidências, Discriminação e Contradições
- **Status:** Aceito
- **Contexto:** Fórmulas de soma ponderada linear geram falsa sensação de precisão e ignoram contradições excludentes.
- **Decisão:** O modelo de scoring avalia independentemente compatibilidade, poder discriminatório, confiança na fonte, corroboração, contradições e ganho de informação (`information_gain`), tratando contradições rígidas (`hard_contradictions`) como anuladores formais.
- **Consequências:** Explicabilidade transparente das hipóteses e eliminação de scores opacos ou enganosos.

---

### ADR-009: Proveniência e Estados Epistêmicos como Requisitos Estruturais
- **Status:** Aceito
- **Contexto:** A perda de rastreabilidade da origem dos dados compromete a credibilidade forense da análise.
- **Decisão:** Todo atributo e afirmação no sistema carregará metadados de proveniência (`source`, `observedAt`, `recordedAt`, `confidence`, `provenance`) e pertencerá a um estado epistêmico formal (`CONFIRMED`, `DERIVED`, `UNVERIFIED`, `HYPOTHESIS`, `SYNTHETIC`).
- **Consequências:** Transparência total sobre o grau de certeza de cada informação.

---

### ADR-010: Application como Camada Explícita de Casos de Uso
- **Status:** Aceito
- **Contexto:** A orquestração dos fluxos analíticos e de negócio deve ter um local explícito e padronizado, evitando dispersão em pastas genéricas de "módulos" ou controllers de apresentação.
- **Decisão:** Utilizar `src/application/` como a camada dedicada à orquestração dos casos de uso, interfaces de portas (ports) e fluxos investigativos.
- **Consequências:** Clareza arquitetural e facilidade na substituição de adaptadores externos.

---

### ADR-011: Modelo de Conhecimento Baseado em Fact + Provenance
- **Status:** Aceito
- **Contexto:** Entidades investigativas possuem informações com diferentes graus de certeza, fontes e temporalidades. Representar entidades apenas como registros planos perde o contexto forense.
- **Decisão:** Adotar `Fact` como a unidade atômica de conhecimento vinculada a um sujeito, sempre acompanhada de seu `Provenance` com `sourceId`, `recordedAt`, `observedAt` e `recordedBy`.
- **Consequências:** Capacidade de versionar atributos individuais, rastrear fontes heterogêneas e auditar origens sem corromper o estado global da entidade.

---

### ADR-012: Estados Epistêmicos Não São Promovidos por Score
- **Status:** Aceito
- **Contexto:** O aumento de um score de similaridade descritiva ou probabilidade algorítmica não converte uma inferência em realidade fática.
- **Decisão:** O estado epistêmico `HYPOTHESIS` ou `UNVERIFIED` não pode ser promovido para `CONFIRMED` com base em métricas de confidence ou score. A confirmação exige evento formal de validação por fonte qualificada.
- **Consequências:** Proteção absoluta contra alucinações automatizadas e falsos positivos irreversíveis.

---

### ADR-013: Ausência de Informação é Semanticamente Neutra
- **Status:** Aceito
- **Contexto:** Casos de desaparecimento frequentemente possuem descrições incompletas. Interpretar campos ausentes como incompatibilidade gera descartes indevidos de pistas válidas.
- **Decisão:** A ausência de um atributo (`undefined`/`null`) significa estritamente "desconhecido" e possui valor neutro, não constituindo contradição suave ou rígida.
- **Consequências:** Tolerância a registros parciais e prevenção de falsos descartes em cruzamentos descritivos.

---

### ADR-014: Workflow Interno Separado de Status Oficial
- **Status:** Aceito
- **Contexto:** O andamento analítico de um caso no sistema não se confunde com a situação administrativa/jurídica do desaparecido perante as autoridades.
- **Decisão:** Segregar estritamente o `WorkflowStatus` interno (`DRAFT`, `ACTIVE`, `SUSPENDED`, `CLOSED`) do `OfficialStatus` externo (`OFFICIALLY_MISSING`, `OFFICIALLY_LOCATED`, `STATUS_TO_VERIFY`, `UNKNOWN`).
- **Consequências:** Clareza operacional sem usurpar competências legais de órgãos públicos oficiais.

---

### ADR-015: Hypothesis Nunca é Equivalente a Fact
- **Status:** Aceito
- **Contexto:** Hipóteses articulam conexões probatórias e direcionam linhas de investigação, mas não constituem fatos consumados.
- **Decisão:** Uma `Hypothesis` pode receber suporte (`SUPPORTED`) ou refutação (`WEAKENED`, `REJECTED`), mas não possui mecanismo de conversão direta em `Fact`. A constatação fática exige criação de novos fatos com suas respectivas proveniências.
- **Consequências:** Preservação estrita da separação epistêmica entre teoria investigativa e evidência comprovada.

---

### ADR-016: Application Layer como Entrada Oficial de Operações
- **Status:** Aceito
- **Contexto:** Múltiplos pontos de entrada (UI Next.js, API REST futura, rotinas batch) precisam executar operações no domínio sem duplicação de regras de orquestração.
- **Decisão:** Todos os fluxos operacionais devem passar obrigatoriamente por casos de uso explicitamente modelados em `src/application/use-cases/`.
- **Consequências:** Centralização da orquestração e reutilização consistente da lógica de negócio.

---

### ADR-017: Repository Ports Pertencem à Application Layer
- **Status:** Aceito
- **Contexto:** O domínio deve ser puro e independente de persistência, enquanto a aplicação precisa definir como carregar e persistir agregados.
- **Decisão:** As interfaces abstratas de repositório (`*Repository`) residem em `src/application/ports/` (Inversão de Dependência).
- **Consequências:** O Domínio permanece totalmente agnóstico e a Infraestrutura implementa as portas necessárias.

---

### ADR-018: Persistência Fica Fora do Domain e da Application
- **Status:** Aceito
- **Contexto:** Escolhas de banco de dados e ORM devem ser adiadas e isoladas para evitar acoplamento prematuro.
- **Decisão:** Nenhum código de persistência real (SQL, ORM, filesystem) reside no Domain ou na Application. Adaptadores `InMemory` são usados estritamente em `tests/application/in-memory/`.
- **Consequências:** Flexibilidade total para selecionar a infraestrutura adequada em gates futuros.

---

### ADR-019: Ports Assíncronos Desde o Início
- **Status:** Aceito
- **Contexto:** Repositórios em memória poderiam ser síncronos, mas bancos de dados reais operam via I/O assíncrono.
- **Decisão:** Todas as portas de repositório retornam `Promise<T | null>` e `Promise<void>` desde o primeiro momento.
- **Consequências:** Nenhuma refatoração nos Use Cases será necessária ao plugar bancos assíncronos.

---

### ADR-020: Coerência Referencial Orquestrada pela Application
- **Status:** Aceito
- **Contexto:** Antes da introdução de foreign keys em bancos de dados, o sistema precisa garantir a integridade entre agregados relacionados (ex: `Case.personId` deve corresponder a `MissingEvent.personId`).
- **Decisão:** A Camada de Aplicação valida ativamente a coerência referencial cruzada e existência de entidades antes de persistir alterações.
- **Consequências:** Proteção contra estados órfãos e inconsistências relacionais em tempo de aplicação.

---

### ADR-021: Presentation Não Manipula Entidades de Domain Diretamente
- **Status:** Aceito
- **Contexto:** Permitir que controllers ou componentes UI instanciem entidades ou chamem métodos de domínio diretamente viola a separação de camadas e contorna validações de caso de uso.
- **Decisão:** A camada de apresentação deve exclusivamente chamar Use Cases da Application Layer, recebendo DTOs ou entidades imutáveis como retorno.
- **Consequências:** Blindagem das regras de orquestração e eliminação de mutações acidentais na interface.

---

### ADR-022: SQLite como Persistência Local Inicial
- **Status:** Aceito
- **Contexto:** O MVP local precisa persistir dados entre execuções sem depender de daemons de banco externos, Docker ou configurações complexas.
- **Decisão:** Adotar SQLite local via biblioteca `better-sqlite3` para a persistência em desenvolvimento e testes locais.
- **Consequências:** Persistência rápida, confiável, com suporte a transações ACID e foreign keys, com zero atrito de setup.

---

### ADR-023: Infrastructure Implementa Repository Ports da Application
- **Status:** Aceito
- **Contexto:** Para manter o desacoplamento arquitetural, a camada de persistência deve se comportar como um adaptador de saída.
- **Decisão:** Implementar todas as interfaces de `src/application/ports/` dentro de `src/infrastructure/persistence/sqlite/repositories/`.
- **Consequências:** Inversão de dependência preservada; o sistema pode alternar de SQLite para PostgreSQL sem alterar Domain ou Application.

---

### ADR-024: Domain e Application Permanecem Agnósticos à Persistência
- **Status:** Aceito
- **Contexto:** O vazamento de detalhes de SQL, SQLite ou drivers nas camadas superiores compromete a pureza das regras e testes.
- **Decisão:** `src/domain/` e `src/application/` são estritamente proibidos de importar qualquer módulo de persistência, drivers SQLite ou SQL.
- **Consequências:** Testes unitários do domínio continuam ultrarrápidos e independentes de I/O de disco.

---

### ADR-025: Mappers Separam Modelos de Storage de Entidades de Domínio
- **Status:** Aceito
- **Contexto:** O formato em que os dados são gravados no banco relacional difere do formato de objetos ricos e imutáveis do Domínio.
- **Decisão:** Criar mappers bi-direcionais dedicados (`SourceMapper`, `FactMapper`, etc.) que convertem entre linhas de banco (`Row`) e instâncias de domínio (`Entity`).
- **Consequências:** Isolamento entre detalhes relacionais e semântica de entidades de domínio.

---

### ADR-026: Migrations Versionadas e Idempotentes
- **Status:** Aceito
- **Contexto:** O esquema do banco deve ser criado e evoluído de forma reprodutível e controlada em qualquer ambiente.
- **Decisão:** Implementar um mecanismo simples de migrações SQL versionadas (`001-initial-schema.sql`) rastreadas na tabela `schema_migrations`.
- **Consequências:** Inicialização idempotente, sem necessidade de frameworks ORM pesados.

---

### ADR-027: Repositórios Controlam Atomicidade de Gravações Multi-Tabela
- **Status:** Aceito
- **Contexto:** Agregados com tabelas relacionais auxiliares (ex: `Fact` + `fact_parents`, `Hypothesis` + `evidence`) exigem integridade atômica.
- **Decisão:** Os adaptadores de repositório executam operações de persistência multi-tabela dentro de transações de banco de dados (`db.transaction()`).
- **Consequências:** Prevenção de estados parciais e órfãos em caso de falha durante a gravação.

---

### ADR-028: Banco Local Não é Versionado no Git
- **Status:** Aceito
- **Contexto:** Arquivos de banco de dados em runtime contêm dados transitórios de teste ou desenvolvimento local e não devem poluir o repositório de código.
- **Decisão:** Adicionar `/data/*.db`, `*.sqlite` e artefatos de WAL/Journal explicitamente ao `.gitignore`.
- **Consequências:** Repositório Git limpo e livre de arquivos binários voláteis.

---

### ADR-029: SQLite é Solução de MVP/Local, Não Decisão Definitiva de Produção
- **Status:** Aceito
- **Contexto:** Aplicações de produção multi-instância exigem concorrência de escrita distribuída que excede a proposta do SQLite.
- **Decisão:** O SQLite atende o MVP e desenvolvimento local; no futuro, novos adaptadores PostgreSQL serão criados implementando as mesmas portas de repositório.
- **Consequências:** Evolução arquitetural segura sem lock-in de fornecedor ou tecnologia de banco.