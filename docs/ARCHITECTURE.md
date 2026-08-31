# Arquitetura do Sistema

> **Documento:** `docs/ARCHITECTURE.md`  
> **Versão:** 1.3.0 (Gate 4 — Persistência SQLite Local e Inversão de Dependência)

---

## 1. Visão Geral em Camadas e Boundaries

O sistema adota uma arquitetura em camadas estritamente desacoplada (Clean Architecture / Hexagonal Ports & Adapters), garantindo que as regras analíticas e os fluxos de caso de uso independam de mecanismos de entrega, bancos de dados e integrações externas.

```
       +-------------------------------------------------------+
       |             Presentation (src/app, components)        |
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
      +---------------------------+----------------------------+
      |                           |                            |
+---------------+       +--------------------+       +--------------------+
| Intelligence  |       |   Infrastructure   |       |      Security      |
| (src/intel..) |       | (src/infrastruct.) |       |   (src/security)   |
|               |       | - SQLite Repos     |       |                    |
|               |       | - Mappers          |       |                    |
|               |       | - Migrations       |       |                    |
+---------------+       +--------------------+       +--------------------+
                                  |
                                  v
                        +--------------------+
                        |  data/busca-ia.db  |
                        +--------------------+
```

### 1.1. Presentation (`src/app/`, `src/components/`)
- Camada de interface e pontos de entrada (UI Next.js, futuras rotas de API ou interfaces de comando).
- **Regra Mandatória:** **NUNCA** acessa ou manipula o `Domain` diretamente. Toda operação passa por um `UseCase` da camada `Application`.

### 1.2. Application (`src/application/`) — Casos de Uso e Orquestração
- Orquestra fluxos investigativos, valida coerência referencial e pré-condições.
- Invoca métodos do Domínio e persiste resultados através de **Repository Ports** assíncronos.
- Para detalhes, consulte [`docs/APPLICATION_LAYER.md`](APPLICATION_LAYER.md).

### 1.3. Domain (`src/domain/`) — Núcleo Puro
- Contém entidades, agregados, objetos de valor, estados epistêmicos e regras de invariância.
- **Isolamento Absoluto:** O domínio **não conhece** Next.js, React, bancos de dados, ORMs, Application use cases, LLMs, mapas ou APIs de terceiros.
- Para detalhes, consulte [`docs/DOMAIN_MODEL.md`](DOMAIN_MODEL.md).

### 1.4. Intelligence (`src/intelligence/`) — Adaptadores Analíticos
Implementa motores de análise especializados via adaptadores desacoplados:
- `entity-resolution/`: Algoritmos de correspondência probabilística e reconciliação sob incerteza.
- `temporal/`: Verificação de consistência e plausibilidade temporal.
- `geospatial/`: Proximidade espacial, clusters e validações geográficas.
- `scoring/`: Motor de scoring explicável e multidimensional.
- `graph/`: Modelagem e travessia de grafos relacionais do caso.
- `nlp/`: Extração de entidades estruturadas a partir de relatos livres (preservando o texto bruto).

### 1.5. Infrastructure (`src/infrastructure/`) — Persistência e Integrações
- Implementa as interfaces de portas (`*Repository`) definidas na camada de aplicação.
- Contém conexões de banco de dados (`better-sqlite3`), mappers bi-direcionais, migrations SQL versionadas e controle transacional atômico.
- Para detalhes, consulte [`docs/PERSISTENCE.md`](PERSISTENCE.md).

### 1.6. Security (`src/security/`) — Autorização e Auditoria
- Aplica políticas de RBAC (Role-Based Access Control) e ABAC (Attribute-Based Access Control).
- Gerencia trilhas de auditoria imutáveis e regras de proteção antiabuso.

---

## 2. Modelo de Conhecimento e Proveniência

Um dos pilares do sistema é a diferenciação formal entre dado observado, dado calculado, dado inferido e dado simulado.

### 2.1. Metadados Canônicos de Conhecimento
Cada registro ou atributo relevante no sistema deve carregar:
- **`value`**: O valor ou dado em si.
- **`status`**: O estado epistêmico do dado.
- **`source`**: A fonte formal da informação.
- **`observedAt`**: Data/hora em que o fato foi supostamente observado no mundo real.
- **`recordedAt`**: Data/hora em que o dado foi registrado no sistema.
- **`confidence`**: Grau de confiança técnica na captura ou na fonte (não confundir com probabilidade de identidade).
- **`provenance`**: Rastro completo de origem e método de obtenção.
- **`recordedBy`**: Identificador do usuário, sistema ou sensor que registrou o dado.

---

## 3. Estados Epistêmicos Canônicos

Todo dado ou afirmação no sistema pertence a um dos seguintes estados epistêmicos fundamentais:

| Estado Epistêmico | Definição |
| :--- | :--- |
| **`CONFIRMED`** | Dado validado por fonte adequada, oficial ou autoridade competente com suporte factual. |
| **`DERIVED`** | Dado calculado deterministicamente a partir de outros dados (ex: idade derivada da data de nascimento). |
| **`UNVERIFIED`** | Informação recebida (ex: relato livre ou pista bruta) ainda não submetida à validação. |
| **`HYPOTHESIS`** | Inferência investigativa ou hipótese gerada analiticamente ou sugerida por analista. |
| **`SYNTHETIC`** | Dado gerado artificialmente para fins de teste, desenvolvimento, benchmark ou simulação. |

---

## 4. Invariantes de Domínio Obrigatórias

As seguintes invariantes de integridade epistêmica são impostas em tempo de compilação e execução:

1. **Invariante de Segregação Sintética:** `SYNTHETIC` jamais pode ser promovido para `CONFIRMED` ou `DERIVED` de forma silenciosa ou automática.
2. **Invariante de Hipótese:** Um registro `HYPOTHESIS` não se transforma em `CONFIRMED` apenas porque seu score analítico aumentou.
3. **Invariante de Rastreabilidade Derivada:** Qualquer dado `DERIVED` deve obrigatoriamente manter referências explícitas aos dados primários dos quais foi gerado (`parentFactIds`).
4. **Invariante de Exibição:** Dados `UNVERIFIED` ou `HYPOTHESIS` nunca podem ser exibidos ou reportados como fatos confirmados.
5. **Invariante de Auditoria:** Toda e qualquer alteração de estado epistêmico, reclassificação ou promoção de hipótese deve gerar um registro de auditoria imutável detalhando autor, motivo, data/hora e regras aplicadas.

---

## 5. Modelo de Scoring Investigativo

O motor de scoring **NÃO** deve ser implementado como uma soma ingênua de pesos fixos (`score = peso1 * atrib + peso2 * geo + peso3 * tempo`), pois fórmulas lineares simplistas produzem falsa precisão e mascaram contradições críticas.

O cálculo investigativo é estruturado em múltiplas dimensões analíticas explícitas:

1. **`compatibility` (Compatibilidade):** Avalia se as características observadas são mutuamente possíveis.
2. **`discriminative_power` (Poder Discriminatório):** Mede o quanto determinado atributo reduz o espaço amostral.
3. **`source_trust` (Confiabilidade da Fonte):** Modela a credibilidade e a natureza da fonte.
4. **`corroboration` (Corroboração Independente):** Mede o suporte mútuo fornecido por fontes comprovadamente independentes.
5. **`contradictions` (Contradições Suaves):** Registra divergências explicáveis por imprecisão de relato ou estimativa.
6. **`hard_contradictions` (Contradições Rígidas):** Fatos excludentes irreconciliáveis (anulam formalmente a hipótese de identidade).
7. **`information_gain` (Ganho de Informação):** Quantifica o quanto uma nova evidência reduz a incerteza global do caso.