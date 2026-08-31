# Camada de Aplicação (Application Layer)

> **Documento:** `docs/APPLICATION_LAYER.md`  
> **Versão:** 1.0.0 (Gate 3 — Application Layer + Case Lifecycle)

---

## 1. Papel da Camada de Aplicação

A Camada de Aplicação (`src/application/`) é a porta de entrada oficial para todas as operações investigativas e de negócio da plataforma. Seu papel é **orquestrar casos de uso**, coordenando:

1. **Validação de Pré-condições:** Coerência referencial, existência de entidades relacionadas e prevenção de duplicidades de identidade.
2. **Carregamento de Entidades:** Recuperação de entidades agregadas através de **Repository Ports** abstratos.
3. **Delegação ao Domínio:** Invocação de métodos do núcleo puro (`src/domain/`), que impõe as regras de negócio e invariantes epistêmicas.
4. **Persistência de Resultados:** Salvamento das entidades alteradas via Ports.
5. **Retorno Explícito:** Devolução de outputs tipados para a camada que originou a requisição (Presentation / CLI / Jobs).

---

## 2. Separação Estrita: Application vs. Domain

```
+-------------------------------------------------------------------------+
|                          APPLICATION LAYER                              |
|                                                                         |
|  - Orquestra fluxos e transações conceituais                           |
|  - Verifica se Person existe antes de criar Case                       |
|  - Define portas assíncronas (Repository Ports)                         |
|  - Lança Application Errors (EntityNotFoundError, ConflictError, etc.)  |
|  - NÃO define o que é um fato, uma hipótese ou uma contradição         |
+-------------------------------------------------------------------------+
                                    |
                                    v (dependência unidirecional)
+-------------------------------------------------------------------------+
|                            DOMAIN LAYER                                 |
|                                                                         |
|  - Núcleo puro de conhecimento investigativo                            |
|  - Aplica invariantes epistêmicas (ex: SYNTHETIC não vira CONFIRMED)    |
|  - Modela imutabilidade das entidades                                   |
|  - Avalia neutralidade da ausência de informação vs contradições        |
|  - NÃO conhece repositórios, bancos, APIs ou casos de uso              |
+-------------------------------------------------------------------------+
```

---

## 3. Por que a Apresentação (Presentation) NÃO Chama o Domínio Diretamente

No sistema, **Presentation nunca interage diretamente com o Domain**.

```
[ ERRADO / PROIBIDO ]:
UI / Controller ---> new Case(...) ---> Fact.confirm(...) ---> Repository.save(...)

[ CORRETO / CANÔNICO ]:
UI / API / CLI  ---> UseCase.execute(input) ---> Domain Methods ---> Repository Port
```

**Motivos Arquiteturais:**
1. **Garantia de Coerência Referencial:** Um controller direto poderia associar um `MissingEvent` a uma `Person` incorreta ou ignorar a verificação de existência da fonte.
2. **Imutabilidade e Segurança:** Impede que interfaces web executem casting forçado de propriedades ou contornem invariantes de auditoria.
3. **Desacoplamento Tecnológico:** A lógica de orquestração independe de estarmos rodando em Next.js Server Components, Route Handlers, background workers ou CLI.

---

## 4. Repository Ports (Contratos Abstratos Assíncronos)

Os repositórios são definidos como interfaces TypeScript puras em `src/application/ports/`:

- `SourceRepository`
- `PersonRepository`
- `MissingEventRepository`
- `CaseRepository`
- `FactRepository`
- `TipRepository`
- `EvidenceRepository`
- `HypothesisRepository`

### Por que Ports Pertencem à Application?
Segundo a Clean Architecture, a camada de aplicação define quais necessidades de leitura e escrita possui para cumprir seus casos de uso (Inversão de Dependência). A infraestrutura (`src/infrastructure/`) futuramente implementará esses contratos.

### Por que Métodos Assíncronos (`Promise<...>`) Desde o Início?
Mesmo nos testes locais com adaptadores em memória (`Map`), todas as assinaturas retornam `Promise`. Isso garante que quando a persistência real for introduzida (PostgreSQL, SQLite, etc.), **nenhum caso de uso precisará ser refatorado**.

---

## 5. Casos de Uso Implementados (Gate 3)

| Caso de Uso | Arquivo | Responsabilidade |
| :--- | :--- | :--- |
| **`RegisterSource`** | `register-source.ts` | Registra canais/fontes formais com validação de unicidade. |
| **`RegisterPerson`** | `register-person.ts` | Registra identidade investigativa tolerando incompletude cadastral. |
| **`RegisterMissingEvent`**| `register-missing-event.ts` | Registra evento circunstancial exigindo vínculo com `Person` existente. |
| **`CreateCase`** | `create-case.ts` | Cria agregado raiz garantindo coerência referencial cruzada (`MissingEvent.personId === Person.id`). |
| **`AddFact`** | `add-fact.ts` | Registra unidade de conhecimento validando existência da fonte e ancestrais derivados. |
| **`RegisterTip`** | `register-tip.ts` | Registra relato público preservando texto bruto e impondo status `UNVERIFIED`. |
| **`AddEvidence`** | `add-evidence.ts` | Documenta achado probatório sem alterar hipóteses de forma automática. |
| **`CreateHypothesis`** | `create-hypothesis.ts` | Formula proposição investigativa validando existência das evidências vinculadas. |
| **`ChangeCaseWorkflowStatus`** | `change-case-workflow-status.ts` | Altera status operacional interno (`DRAFT` → `ACTIVE`) sem tocar no status oficial. |
| **`UpdateOfficialStatus`** | `update-official-status.ts` | Atualiza status legal/administrativo com proveniência sem alterar status de workflow. |

---

## 6. Tratamento de Erros e Hierarquia

A aplicação utiliza classes de erro padronizadas:
- **`EntityNotFoundError`:** Entidade necessária (Person, Case, Source, Parent Fact) não existe no repositório.
- **`ConflictError`:** Tentativa de duplicar identificador pré-existente.
- **`InvalidOperationError`:** Incoerência referencial entre entidades correlacionadas.
- **`DomainInvariantError` / `InvalidEpistemicTransitionError`:** Erros originados diretamente no domínio quando regras canônicas invioláveis são violadas.

---

## 7. Limitações e Observações do Gate 3

1. **Sem Persistência em Disco:** O Gate 3 não grava dados em arquivos ou banco. Os adaptadores `InMemory` residem exclusivamente em `tests/application/in-memory/` para validação automatizada de testes.
2. **Atomicidade e Transações:** Como os repositórios são desacoplados e operam em memória, transações ACID serão introduzidas nos gates de persistência na camada de infraestrutura.