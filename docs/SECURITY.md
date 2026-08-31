# Fundação de Segurança e Controle de Acesso (RBAC + ABAC)

> **Documento:** `docs/SECURITY.md`  
> **Versão:** 1.0.0 (Gate 6 — Security Foundation + RBAC + Audit Context)

---

## 1. Modelo de Ameaças Resumido (Threat Model)

A plataforma processa dados altamente sensíveis sobre investigações de desaparecimento, pessoas em vulnerabilidade extrema, testemunhas, pistas anônimas e medidas protetivas judiciais.

### Principais Vetores de Risco Mitigados:
1. **Acesso Indevido a Pessoas Localizadas/Protegidas:** Prevenção contra stalkers, agressores de violência doméstica e curiosos tentando localizar vítimas ou testemunhas protegidas.
2. **Vazamento de Pistas e Relatos Brutos:** Proteção da integridade de denunciantes e garantia de não contaminação investigativa.
3. **Usurpação de Competência Oficial:** Impossibilidade de atores não oficiais promoverem ou alterarem o `OfficialStatus` administrativo de um caso.
4. **Privilégio Técnico Usurpando Sigilo Investigativo:** `SYSTEM_ADMIN` não possui privilégio automático para acessar conteúdos confidenciais ou criar entidades investigativas.
5. **Acesso a Casos Sigilosos (`SEALED`):** Casos sob segredo de justiça ou proteção extrema falham fechados (`DENY_SEALED`) por padrão.

---

## 2. Princípio Central: Deny by Default

> **REGRA ABSOLUTA:** Qualquer requisição, contexto, permissão ou combinação não expressamente autorizada por uma política explícita resulta em **NEGAÇÃO IMEDIATA (DENY)**.
>
> Não existe comportamento permissivo de fallback ("se não sei, deixa passar").

```
Incoming Request
      │
      ▼
Actor Authenticated? ──(No)──► DENY (401 Unauthenticated) ──► Audit Event (DENIED)
      │ (Yes)
      ▼
Role has Permission? ──(No)──► DENY (403 Forbidden) ───────► Audit Event (DENIED)
      │ (Yes)
      ▼
Case Scope Assigned? ──(No)──► DENY (403 Forbidden) ───────► Audit Event (DENIED)
      │ (Yes)
      ▼
Privacy Level OK? ────(No)──► DENY (403 Forbidden) ───────► Audit Event (DENIED)
      │ (Yes)
      ▼
ALLOW (Execute Command) ──────────────────────────────────► Audit Event (SUCCEEDED / FAILED)
```

---

## 3. ActorContext

O `ActorContext` encapsula a identidade mínima necessária para a tomada de decisão de autorização, evitando carregar dados pessoais desnecessários.

```typescript
export interface ActorContext {
  readonly actorId?: ActorId;         // Identificador opaco do ator (branded type)
  readonly roles: readonly Role[];     // Papéis canônicos atribuídos
  readonly organizationId?: string;    // Organização de lotação (opcional)
  readonly caseScopes?: readonly CaseId[]; // Casos específicos autorizados
  readonly requestId: string;          // Rastreabilidade ponta a ponta
  readonly authenticated: boolean;     // Status de autenticação
}
```

---

## 4. Matriz Canônica de Roles e Permissions

### 4.1. Roles Canônicos
- **`PUBLIC_USER`**: Usuário não autenticado ou cidadão comum (submissão de relatos/tips e consulta pública).
- **`FAMILY_AUTHORIZED`**: Familiar credenciado formalmente no caso com escopo restrito.
- **`ANALYST`**: Analista de inteligência com atuação em casos sob sua atribuição.
- **`NGO_OPERATOR`**: Operador de entidade não governamental conveniada.
- **`HEALTH_OPERATOR`**: Profissional de saúde (hospitais/prontos-socorros).
- **`SOCIAL_ASSISTANCE`**: Assistente social em abrigos e centros de acolhimento.
- **`LAW_ENFORCEMENT`**: Autoridade policial e agentes de segurança pública.
- **`CASE_MANAGER`**: Gestor operacional de casos e coordenação investigativa.
- **`SYSTEM_ADMIN`**: Administrador estritamente técnico de infraestrutura.

### 4.2. Matriz de Permissões Explícitas

| Permissão | PUBLIC | FAMILY | ANALYST | NGO / HEALTH / SOCIAL | LAW_ENFORCEMENT | CASE_MANAGER | SYSTEM_ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `SOURCE_CREATE` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `PERSON_CREATE` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `MISSING_EVENT_CREATE`| ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `CASE_CREATE` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `FACT_CREATE` | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `TIP_CREATE` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `EVIDENCE_CREATE` | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `HYPOTHESIS_CREATE`| ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `CASE_WORKFLOW_UPDATE`| ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `CASE_OFFICIAL_STATUS_UPDATE`| ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `CASE_VIEW_PUBLIC` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `CASE_VIEW_RESTRICTED`| ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `CASE_VIEW_CONFIDENTIAL`| ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `CASE_VIEW_LAW_ENFORCEMENT`| ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `CASE_VIEW_SEALED` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `TIMELINE_ANALYZE` | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `AUDIT_VIEW` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `SYSTEM_ADMINISTRATION`| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

> [!IMPORTANT]
> **SEPARAÇÃO ESTRITA DO SYSTEM_ADMIN:**  
> O `SYSTEM_ADMIN` não é um "superusuário investigativo". Ele administra configurações técnicas e visualiza auditorias de sistema, mas não pode criar evidências, formular hipóteses ou visualizar dados de casos confidenciais.

---

## 5. Níveis de Privacidade de Casos (PrivacyLevel)

Os níveis de privacidade são independentes de `WorkflowStatus`, `OfficialStatus` e `EpistemicStatus`:

1. **`PUBLIC`**: Informações autorizadas para divulgação aberta ou campanhas públicas de busca.
2. **`RESTRICTED`**: *(Padrão Seguro)* Acesso restrito a equipes operacionais e familiares autorizados.
3. **`CONFIDENTIAL`**: Acesso limitado a analistas e autoridades responsáveis pela apuração.
4. **`LAW_ENFORCEMENT_ONLY`**: Acesso exclusivo de autoridades policiais (ex: diligências sigilosas).
5. **`SEALED`**: Segredo de justiça / proteção máxima. **Falha fechada (`DENY_SEALED`)** por padrão.

---

## 6. Dev Actor Resolver e Regra de Segurança em Produção

Para validar a arquitetura sem autenticação real implementada neste gate, a plataforma utiliza um resolver de desenvolvimento (`resolveActorContext`) via cabeçalhos controlados (`x-actor-id`, `x-actor-roles`, `x-actor-case-scopes`).

> [!CAUTION]
> **PROTEÇÃO MANDATÓRIA DE PRODUÇÃO:**  
> Em ambiente de produção (`NODE_ENV === "production"`), o resolver **ignora 100% dos cabeçalhos de desenvolvimento**, forçando qualquer requisição sem identidade real a ser tratada como não autenticada (`UNAUTHENTICATED`).