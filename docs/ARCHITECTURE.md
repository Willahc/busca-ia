# Arquitetura do Sistema

> **Documento:** `docs/ARCHITECTURE.md`  
> **Versão:** 1.4.0 (Gate 5 — Fronteira HTTP e Composition Root)

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
       |        - Route Handlers                               |
       |        - Input Validation (Zod)                       |
       |        - DTO Mappers                                  |
       |        - Centralized Error Handler                    |
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
|               |       | - Composition Root |       |                    |
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

### 1.1. Presentation / API (`src/app/api/`)
- Adaptador de entrada HTTP estruturado sob o Next.js App Router (`/api/v1/` e probes `/api/health`, `/api/readiness`).
- Valida formato e tipos via Zod e mapeia retornos para DTOs planos.
- **Regra Mandatória:** **NUNCA** acessa ou manipula o `Domain` diretamente e **NUNCA** instancia repositórios SQLite de forma direta. Toda dependência é provida pela Composition Root.
- Para detalhes, consulte [`docs/API.md`](API.md).

### 1.2. Application (`src/application/`) — Casos de Uso e Orquestração
- Orquestra fluxos investigativos, valida coerência referencial cruzada e pré-condições.
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

### 1.5. Infrastructure (`src/infrastructure/`) — Persistência e Composition Root
- Implementa as interfaces de portas (`*Repository`) definidas na camada de aplicação.
- Centraliza o container de dependências (`AppContainer`) na Composition Root (`src/infrastructure/composition/`).
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