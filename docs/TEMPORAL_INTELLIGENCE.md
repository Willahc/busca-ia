# Motor de Inteligência Temporal

A camada de Inteligência Temporal (`src/intelligence/temporal/`) implementa um motor determinístico, auditável e puro para reconstrução cronológica, análise de relações, identificação de lapsos temporais (gaps), detecção de contradições estritas e derivação de intervalos compostos no contexto de investigação de pessoas desaparecidas.

---

## 1. Princípios Epistêmicos Fundamentais

1. **Ausência de Informação Não é Contradição:** A falta de datas em fatos, relatos ou evidências é epistemicamente neutra e reflete a realidade das investigações de desaparecimento. O motor nunca assume contradição a partir do silêncio de dados.
2. **Gap != Contradiction:** Grandes lapsos de tempo entre dois registros sucessivos indicam ausência de avistamentos conhecidos, jamais inconsistência lógica ou impossibilidade factual.
3. **Imutabilidade e Rastreabilidade da Proveniência:** Cada evento da linha do tempo (`TimelineEvent`) preserva os identificadores dos fatos (`sourceFactIds`), relatos (`sourceTipIds`) ou evidências (`sourceEvidenceIds`) de origem.
4. **Teto de Precisão em Derivações:** A precisão de qualquer resultado derivado (ex.: intervalo de duração) não pode exceder o menor grau de precisão entre os termos de entrada (`min rank`). É proibido inventar segundos ou minutos a partir de datas imprecisas.
5. **Diferenciação Semântica Estrita de Timestamps:**
   - `Tip.receivedAt`: Data e hora em que a central recebeu a denúncia (tempo de recepção administrativa). Nunca é convertida automaticamente em `observedAt` do fato narrado.
   - `Evidence.recordedAt`: Data e hora em que o item entrou sob custódia formal (tempo de registro). Não representa a data em que o fato investigado ocorreu no mundo físico.
   - `Fact.observedAt`: Data e hora em que o evento no mundo real foi diretamente presenciado.
6. **Determinismo e Pureza:** O motor temporal opera como função pura. Dadas as mesmas entidades e dados de entrada, a saída analítica é rigorosamente idêntica (sem dependência de relógios ocultos, sementes aleatórias ou modelos LLM).

---

## 2. Níveis de Precisão Temporal (`TemporalPrecision`)

| Precisão | Expressão de Exemplo | Semântica e Intervalo UTC |
| :--- | :--- | :--- |
| `EXACT` | `2026-08-31T15:30:00Z` | Timestamp pontual com precisão de segundos e fuso horário definido. |
| `DAY` | `2026-08-31` | Cobre todo o dia calendário `[00:00:00.000Z, 23:59:59.999Z]`. |
| `MONTH` | `2026-08` | Cobre o mês inteiro `[2026-08-01T00:00:00Z, 2026-08-31T23:59:59.999Z]`. |
| `YEAR` | `2026` | Cobre o ano calendário `[2026-01-01T00:00:00Z, 2026-12-31T23:59:59.999Z]`. |
| `APPROXIMATE` | `2026-08-31T15:30:00` | Horário local sem indicação de fuso horário; marcado como aproximado. |
| `INTERVAL` | `2026-06/2026-08` | Intervalo fechado ou semiaberto delimitado por dois pontos temporais. |
| `UNKNOWN` | Expressão ausente ou inválida | Expressão temporal não resolvida; não descarta o evento da timeline. |

---

## 3. Relações Temporais de Intervalos (`TemporalRelationEvaluator`)

O motor compara pares de eventos utilizando álgebra de intervalos baseada nas relações de Allen:

- `BEFORE`: O limite máximo de A é estritamente anterior ao limite mínimo de B.
- `AFTER`: O limite mínimo de A é estritamente posterior ao limite máximo de B.
- `EQUAL`: Os limites mínimo e máximo de A e B são estritamente idênticos.
- `OVERLAPS`: Os intervalos de A e B se interceptam parcialmente.
- `CONTAINS`: O intervalo de A engloba totalmente o intervalo de B.
- `CONTAINED_BY`: O intervalo de A está totalmente contido no intervalo de B.
- `INDETERMINATE`: Um ou ambos os eventos possuem precisão `UNKNOWN` ou dados ausentes.

---

## 4. Avaliação de Contradições (`TemporalContradictionEvaluator`)

As contradições temporais são detectadas unicamente por regras determinísticas explícitas:

1. `EXACT_TIMESTAMP_CONFLICT`: Dois fatos atribuem valores distintos e disjuntos para o mesmo atributo singular exclusivo da mesma pessoa (ex.: `missing.at` ou `date_of_birth`). Gravidade: `HARD`.
2. `IMPOSSIBLE_SEQUENCE`: Um evento de início (`event.start`) possui timestamp estritamente posterior ao evento de término (`event.end`) do mesmo agregado. Gravidade: `HARD`.
3. `NON_OVERLAPPING_EXCLUSIVE_INTERVALS`: Dois estados mutuamente exclusivos declarados para o mesmo sujeito em intervalos temporais disjuntos e contraditórios. Gravidade: `HARD`.

Fatos com status `UNVERIFIED` conflitantes com fatos `CONFIRMED` geram registros estruturados de contradição sem que o motor altere arbitrariamente os status epistêmicos de origem.

---

## 5. Avaliação de Lapsos Temporais (`TemporalGapEvaluator`)

- Eventos cronologicamente ordenados com intervalos positivos geram registros de `TemporalGap`.
- Para eventos com precisão `EXACT`, a duração em minutos (`durationMinutes`) e dias (`durationDays`) é calculada matematicamente.
- Para precisões a nível de dia (`DAY`), a distância é calculada em dias inteiros.
- Eventos simultâneos ou sobrepostos não geram gaps positivos.

---

## 6. Derivação de Intervalos (`TemporalDerivationEngine`)

- Fatos pareados de início (`event.start`) e término (`event.end`) geram um fato derivado `event.duration_interval`.
- O status epistêmico do resultado derivado é sempre `DERIVED`.
- A precisão do intervalo resultante obedece rigorosamente à regra do teto (`min rank` entre os inputs).

---

## 7. Tratamento de Dados Temporais Insuficientes

Caso um caso não possua nenhum evento com data resolvida:
- A resposta do motor retorna com `status: "INSUFFICIENT_TEMPORAL_DATA"`.
- A lista de `events` contém todos os eventos registrados (preservando metadados e proveniência).
- `unresolvedEvents` detalha os eventos sem ancoragem cronológica.
- As listas `relations`, `contradictions`, `gaps` e `derivations` retornam vazias.
- A API responde com **HTTP 200 OK** (e não erro de validação ou 422), pois ausência de dados temporais é uma condição legítima do ciclo de vida da investigação.

---

## 8. API Endpoint e Segurança

- **Rota:** `POST /api/v1/cases/[caseId]/timeline/analyze`
- **Permissão Obrigatória:** `TIMELINE_ANALYZE`
- **Papeis Autorizados:** `ANALYST`, `LAW_ENFORCEMENT`, `CASE_MANAGER`.
- **Atores Negados:** `PUBLIC_USER`, `SYSTEM_ADMIN` (zero privilégio investigativo).
- **Escopo de Caso:** Analistas só podem requisitar análise para casos explicitamente atribuídos em `x-actor-case-scopes`.
- **Fail-Closed:** Casos com nível de privacidade `SEALED` recusam a requisição com **HTTP 403 Forbidden**.
- **Auditoria:** Cada chamada registra evento na tabela `audit_events` com ação `TIMELINE_ANALYZE`, desfecho `SUCCEEDED` ou `DENIED`, e identificador do caso.