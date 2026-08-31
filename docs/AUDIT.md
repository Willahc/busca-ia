# Trilha de Auditoria e Contexto de Registro (Audit Context)

> **Documento:** `docs/AUDIT.md`  
> **Versão:** 1.0.0 (Gate 6 — Security Foundation + RBAC + Audit Context)

---

## 1. Visão Geral da Auditoria

A trilha de auditoria da plataforma registra de forma estruturada e persistente **todas as tentativas e operações de negócio**, garantindo a rastreabilidade institucional das decisões e acessos.

A auditoria responde com precisão à pergunta:
> *"Quem tentou ou realizou qual ação, em qual momento, sobre qual recurso e com qual desfecho?"*

---

## 2. Estrutura do AuditEvent

```typescript
export interface AuditEventProps {
  readonly auditEventId: string;    // UUID único do evento de auditoria
  readonly actorId?: string | null;  // Identificador do ator responsável (null se não autenticado)
  readonly requestId: string;        // ID da requisição HTTP (correlação ponta a ponta)
  readonly action: AuditAction;      // Ação executada (ex: CASE_CREATE, FACT_CREATE)
  readonly resourceType: AuditResourceType; // Tipo de entidade alvo (ex: CASE, EVIDENCE)
  readonly resourceId?: string | null;      // ID da entidade criada ou modificada
  readonly occurredAt?: Date;        // Timestamp UTC da ocorrência
  readonly outcome: AuditOutcome;    // Desfecho da operação (SUCCEEDED, DENIED, FAILED)
  readonly reasonCode?: string | null; // Código da recusa ou falha (ex: DENY_NO_PERMISSION)
}
```

---

## 3. Desfechos de Auditoria (AuditOutcomes)

1. **`SUCCEEDED`**: A requisição foi autorizada e a operação foi concluída e persistida com sucesso.
2. **`DENIED`**: A requisição foi negada na fronteira de segurança (ator não autenticado, sem permissão, fora do escopo do caso ou violando o nível de privacidade).
3. **`FAILED`**: A requisição foi autorizada, mas a execução falhou na regra de negócio ou camada de persistência.

---

## 4. Princípio Mandatório de Minimização de Dados

> [!IMPORTANT]
> **A AUDITORIA REGISTRA METADADOS DE AÇÃO, NUNCA CONTEÚDO INVESTIGATIVO.**  
> Para garantir a privacidade de denunciantes, testemunhas e vítimas, os eventos de auditoria **JAMAIS** armazenam:
> - `originalText` de pistas e relatos
> - `description` de evidências
> - `statement` de hipóteses
> - `value` de fatos ou dados biométricos/médicos
> - Payloads JSON brutos completos

---

## 5. Persistência em SQLite e Comportamento de Restart

Os eventos de auditoria são persistidos na tabela relacional `audit_events` criada via migração `002-security-audit.sql`:

```sql
CREATE TABLE IF NOT EXISTS audit_events (
  audit_event_id TEXT PRIMARY KEY,
  actor_id TEXT,
  request_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  occurred_at TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reason_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_events (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_request_id ON audit_events (request_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_events (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_occurred_at ON audit_events (occurred_at);
```

- **Resistência a Restart:** Todos os eventos sobrevivem ao encerramento e reinicialização das conexões do banco de dados local.
- **Fail-Closed:** Em comandos protegidos sensíveis, falhas na gravação da auditoria provocam a rejeição segura da requisição.

---

## 6. Limitações e Escopo Forense Atual

- **Append-Oriented:** A API do repositório de auditoria suporta apenas operações de inserção (`save`) e leitura forense (`findById`, `findByRequestId`). Não há endpoints ou métodos de `UPDATE` ou `DELETE`.
- **Não é Hardware WORM / HSM:** No ambiente de desenvolvimento local com SQLite, o arquivo do banco reside no disco local. Não há garantia criptográfica de hardware (HSM/WORM) nesta fase inicial de desenvolvimento.