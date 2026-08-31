# Arquitetura do Sistema

> **Documento:** `docs/ARCHITECTURE.md`  
> **Versão:** 1.0.0 (Gate 1 — Fundação Técnica)

---

## 1. Visão Geral em Camadas e Boundaries

O sistema adota uma arquitetura em camadas orientada ao domínio puro, garantindo o desacoplamento absoluto entre as regras de negócio analíticas e os mecanismos de apresentação, frameworks, bibliotecas analíticas e infraestrutura.

```
       +-------------------------------------------------------+
       |             Presentation (src/app, components)        |
       +-------------------------------------------------------+
                                  |
                                  v
       +-------------------------------------------------------+
       |             Application (src/application)             |
       +-------------------------------------------------------+
                                  |
                                  v
       +-------------------------------------------------------+
       |               Domain (src/domain) [PURO]              |
       +-------------------------------------------------------+
                                  ^
                                  | (implementa portas / contratos)
      +---------------------------+----------------------------+
      |                           |                            |
+---------------+       +--------------------+       +--------------------+
| Intelligence  |       |   Infrastructure   |       |      Security      |
| (src/intel..) |       | (src/infrastruct.) |       |   (src/security)   |
+---------------+       +--------------------+       +--------------------+
```

### 1.1. Domain (`src/domain/`) — Núcleo Puro
- Contém entidades, agregados, objetos de valor, estados epistêmicos e regras de invariância.
- **Isolamento Absoluto:** O domínio **não conhece** Next.js, React, bancos de dados, ORMs (Prisma/Drizzle), LLMs, serviços de mapas, bibliotecas externas de matching (ex: Splink) ou APIs de terceiros.
- Depende exclusivamente da linguagem pura (TypeScript/JavaScript).

### 1.2. Application (`src/application/`) — Casos de Uso
- Orquestra o fluxo de execução dos casos de uso investigativos.
- Define portas de entrada e saída (interfaces de repositórios, serviços analíticos e provedores de segurança).
- Coordena transações e invoca entidades de domínio.

### 1.3. Intelligence (`src/intelligence/`) — Adaptadores Analíticos
Implementa motores de análise especializados via adaptadores desacoplados:
- `entity-resolution/`: Algoritmos de correspondência probabilística e reconciliação sob incerteza.
- `temporal/`: Verificação de consistência e plausibilidade temporal.
- `geospatial/`: Proximidade espacial, clusters e validações geográficas.
- `scoring/`: Motor de scoring explicável e multidimensional.
- `graph/`: Modelagem e travessia de grafos relacionais do caso.
- `nlp/`: Extração de entidades estruturadas a partir de relatos livres (preservando o texto bruto).

### 1.4. Infrastructure (`src/infrastructure/`) — Persistência e Integrações
- Implementa adaptadores de persistência de dados, armazenamento de arquivos, mensageria e integrações externas.

### 1.5. Security (`src/security/`) — Autorização e Auditoria
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

As seguintes invariantes de integridade epistêmica devem ser impostas em tempo de compilação e execução:

1. **Invariante de Segregação Sintética:** `SYNTHETIC` jamais pode ser promovido para `CONFIRMED` ou `DERIVED` de forma silenciosa ou automática.
2. **Invariante de Hipótese:** Um registro `HYPOTHESIS` não se transforma em `CONFIRMED` apenas porque seu score analítico aumentou.
3. **Invariante de Rastreabilidade Derivada:** Qualquer dado `DERIVED` deve obrigatoriamente manter referências explícitas aos dados primários dos quais foi gerado.
4. **Invariante de Exibição:** Dados `UNVERIFIED` ou `HYPOTHESIS` nunca podem ser exibidos ou reportados como fatos confirmados.
5. **Invariante de Auditoria:** Toda e qualquer alteração de estado epistêmico, reclassificação ou promoção de hipótese deve gerar um registro de auditoria imutável detalhando autor, motivo, data/hora e regras aplicadas.

---

## 5. Modelo de Scoring Investigativo

O motor de scoring **NÃO** deve ser implementado como uma soma ingênua de pesos fixos (`score = peso1 * atrib + peso2 * geo + peso3 * tempo`), pois fórmulas lineares simplistas produzem falsa precisão e mascaram contradições críticas.

O cálculo investigativo é estruturado em múltiplas dimensões analíticas explícitas:

1. **`compatibility` (Compatibilidade):** Avalia se as características observadas são mutuamente possíveis (ex: faixa etária estimada compatível com data de nascimento). *Compatibilidade não implica identidade.*
2. **`discriminative_power` (Poder Discriminatório):** Mede o quanto determinado atributo reduz o espaço amostral. Atributos comuns ("homem de barba") têm baixo poder; atributos raros ("cicatriz cirúrgica específica + data exata") têm alto poder.
3. **`source_trust` (Confiabilidade da Fonte):** Modela a credibilidade e a natureza da fonte (relato anônimo, cidadão autenticado, hospital, serviço social, órgão policial).
4. **`corroboration` (Corroboração Independente):** Mede o suporte mútuo fornecido por fontes comprovadamente independentes entre si (evitando amplificação por replicação circular de boatos).
5. **`contradictions` (Contradições Suaves):** Registra divergências que podem ser explicadas por imprecisão de relato, iluminação ou estimativa.
6. **`hard_contradictions` (Contradições Rígidas):** Fatos excludentes irreconciliáveis (ex: registro oficial de nascimento em data incompatível, presença comprovada em local fisicamente inalcançável). Uma contradição rígida anula a hipótese de identidade, independentemente de coincidências secundárias.
7. **`information_gain` (Ganho de Informação):** Quantifica o quanto uma nova pista ou evidência reduz a incerteza global do caso.
