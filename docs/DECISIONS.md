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
