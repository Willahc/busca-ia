"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface CaseItem {
  caseId: string;
  personId: string;
  missingEventId: string;
  workflowStatus: string;
  officialStatus: string;
  privacyLevel: string;
  createdAt: string;
  updatedAt: string;
  displayName?: string;
}

interface FactItem {
  factId: string;
  attribute: string;
  value: unknown;
  epistemicStatus: string;
}

interface TipItem {
  tipId: string;
  originalText: string;
  receivedAt: string;
  epistemicStatus: string;
}

interface CandidateItem {
  personId: string;
  displayName: string;
}

interface CaseDetail {
  case: CaseItem | null;
  facts: FactItem[];
  tips: TipItem[];
  candidates: CandidateItem[];
}

interface ComparisonResult {
  conclusion: string;
  comparisons: {
    attribute: string;
    outcome: string;
    discriminativePower: string;
    contradictionSeverity: string;
  }[];
}

interface TimelineResult {
  status: string;
  events: unknown[];
  relations: unknown[];
  contradictions: unknown[];
  gaps: { explanation: string; durationDays?: number }[];
  unresolvedEvents: unknown[];
}

interface Envelope<T> {
  data: T;
}

const actorHeaders = {
  "x-actor-id": "LOCAL-CASE-ADMIN",
  "x-actor-roles": "CASE_ADMIN",
};

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...actorHeaders,
      ...init.headers,
    },
  });
  const payload = (await response.json()) as Envelope<T> | {
    error?: { message?: string; code?: string };
  };

  if (!response.ok) {
    const message =
      "error" in payload && payload.error?.message
        ? payload.error.message
        : `A solicitação falhou (HTTP ${response.status}).`;
    throw new Error(message);
  }

  return (payload as Envelope<T>).data;
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Em andamento",
    DRAFT: "Rascunho",
    SUSPENDED: "Suspenso",
    CLOSED: "Encerrado",
    UNKNOWN: "Não informado",
    OFFICIALLY_MISSING: "Desaparecida",
    OFFICIALLY_LOCATED: "Localizada",
    STATUS_TO_VERIFY: "A verificar",
  };
  return labels[value] ?? value;
}

function factLabel(attribute: string): string {
  const labels: Record<string, string> = {
    display_name: "Nome fictício",
    last_known_location: "Último local conhecido",
    "last_seen.at": "Data do último avistamento",
    last_seen_date: "Data do último avistamento",
    "person.birth_date": "Data de nascimento fictícia",
    "person.mother_name": "Nome fictício da mãe",
  };
  return labels[attribute] ?? attribute;
}

export default function CaseWorkspace() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [tipDialogOpen, setTipDialogOpen] = useState(false);
  const [candidateDialogOpen, setCandidateDialogOpen] = useState(false);
  const [comparisons, setComparisons] = useState<Record<string, ComparisonResult>>({});
  const [timelineResult, setTimelineResult] = useState<TimelineResult | null>(null);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<CaseItem[]>("/api/v1/cases");
      setCases(result);
      setSelectedCaseId((current) =>
        current && result.some((item) => item.caseId === current)
          ? current
          : result[0]?.caseId ?? null
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os casos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (caseId: string) => {
    setDetail(null);
    setTimelineResult(null);
    setComparisons({});
    try {
      const result = await apiRequest<CaseDetail>(`/api/v1/cases/${encodeURIComponent(caseId)}`);
      setDetail(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o caso.");
    }
  }, []);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (selectedCaseId) {
      void loadDetail(selectedCaseId);
    } else {
      setDetail(null);
    }
  }, [loadDetail, selectedCaseId]);

  const filteredCases = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return cases;
    return cases.filter((item) =>
      `${item.displayName ?? ""} ${item.caseId} ${item.personId}`
        .toLocaleLowerCase("pt-BR")
        .includes(query)
    );
  }, [cases, search]);

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();
    const lastKnownLocation = String(form.get("lastKnownLocation") ?? "").trim();
    const lastSeenDate = String(form.get("lastSeenDate") ?? "");
    const caseId = newId("SIM-CASE");
    const personId = newId("SIM-PERSON");
    const missingEventId = newId("SIM-EVENT");
    const sourceId = newId("SIM-SOURCE");

    try {
      await apiRequest("/api/v1/sources", {
        method: "POST",
        body: JSON.stringify({
          sourceId,
          type: "SYNTHETIC_TEST",
          label: "Registro demonstrativo — dados sintéticos",
        }),
      });
      await apiRequest("/api/v1/persons", {
        method: "POST",
        body: JSON.stringify({ personId }),
      });
      await apiRequest("/api/v1/missing-events", {
        method: "POST",
        body: JSON.stringify({ missingEventId, personId }),
      });
      await apiRequest("/api/v1/cases", {
        method: "POST",
        body: JSON.stringify({
          caseId,
          personId,
          missingEventId,
          workflowStatus: "ACTIVE",
          officialStatus: "UNKNOWN",
          privacyLevel: "RESTRICTED",
        }),
      });

      const recordedAt = new Date().toISOString();
      const facts = [
        {
          attribute: "display_name",
          value: displayName,
        },
        {
          attribute: "person.full_name",
          value: displayName,
        },
        {
          attribute: "last_known_location",
          value: lastKnownLocation,
        },
        {
          attribute: "last_seen.at",
          value: lastSeenDate,
        },
        ...(String(form.get("birthDate") ?? "")
          ? [{ attribute: "person.birth_date", value: String(form.get("birthDate")) }]
          : []),
        ...(String(form.get("motherName") ?? "").trim()
          ? [{ attribute: "person.mother_name", value: String(form.get("motherName")).trim() }]
          : []),
      ];
      for (const fact of facts) {
        await apiRequest("/api/v1/facts", {
          method: "POST",
          body: JSON.stringify({
            factId: newId("SIM-FACT"),
            subjectId: personId,
            attribute: fact.attribute,
            value: fact.value,
            epistemicStatus: "SYNTHETIC",
            provenance: {
              sourceId,
              observedAt: recordedAt,
              recordedAt,
              recordedBy: "LOCAL-CASE-ADMIN",
              note: "Dado fictício criado para demonstração.",
            },
          }),
        });
      }

      setCaseDialogOpen(false);
      setNotice("Caso demonstrativo criado. Todos os dados foram marcados como sintéticos.");
      setSelectedCaseId(caseId);
      await loadCases();
      setSelectedCaseId(caseId);
    } catch (cause) {
      setError(
        `${cause instanceof Error ? cause.message : "Falha ao criar o caso."} Se a falha ocorreu durante o cadastro, confira a lista antes de tentar novamente; as etapas concluídas podem ter sido persistidas.`
      );
    } finally {
      setBusy(false);
    }
  }

  async function createTip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail?.case) return;
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const sourceId = newId("SIM-SOURCE");

    try {
      await apiRequest("/api/v1/sources", {
        method: "POST",
        body: JSON.stringify({
          sourceId,
          type: "SYNTHETIC_TEST",
          label: "Relato demonstrativo — dados sintéticos",
        }),
      });
      await apiRequest("/api/v1/tips", {
        method: "POST",
        body: JSON.stringify({
          tipId: newId("SIM-TIP"),
          caseId: detail.case.caseId,
          sourceId,
          originalText: String(form.get("originalText") ?? "").trim(),
          provenance: {
            sourceId,
            recordedAt: new Date().toISOString(),
            recordedBy: "LOCAL-CASE-ADMIN",
            note: "Relato fictício para demonstração; não representa uma denúncia real.",
          },
        }),
      });
      setTipDialogOpen(false);
      setNotice("Relato demonstrativo registrado como não verificado.");
      await loadDetail(detail.case.caseId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar o relato.");
    } finally {
      setBusy(false);
    }
  }

  async function analyzeTimeline() {
    if (!selectedCase) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<TimelineResult>(
        `/api/v1/cases/${encodeURIComponent(selectedCase.caseId)}/timeline/analyze`,
        { method: "POST" }
      );
      setTimelineResult(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível analisar a linha do tempo.");
    } finally {
      setBusy(false);
    }
  }

  async function createCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail?.case) return;
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();
    const candidateId = newId("SIM-PERSON");
    const sourceId = newId("SIM-SOURCE");

    try {
      await apiRequest("/api/v1/sources", {
        method: "POST",
        body: JSON.stringify({
          sourceId,
          type: "SYNTHETIC_TEST",
          label: "Perfil candidato demonstrativo — dados sintéticos",
        }),
      });
      await apiRequest("/api/v1/persons", {
        method: "POST",
        body: JSON.stringify({ personId: candidateId }),
      });

      const recordedAt = new Date().toISOString();
      const candidateFacts = [
        { attribute: "display_name", value: displayName },
        { attribute: "person.full_name", value: displayName },
        ...(String(form.get("birthDate") ?? "")
          ? [{ attribute: "person.birth_date", value: String(form.get("birthDate")) }]
          : []),
        ...(String(form.get("motherName") ?? "").trim()
          ? [{ attribute: "person.mother_name", value: String(form.get("motherName")).trim() }]
          : []),
      ];
      for (const fact of candidateFacts) {
        await apiRequest("/api/v1/facts", {
          method: "POST",
          body: JSON.stringify({
            factId: newId("SIM-FACT"),
            subjectId: candidateId,
            attribute: fact.attribute,
            value: fact.value,
            epistemicStatus: "SYNTHETIC",
            provenance: {
              sourceId,
              recordedAt,
              recordedBy: "LOCAL-CASE-ADMIN",
              note: "Perfil fictício criado para demonstrar comparação.",
            },
          }),
        });
      }
      await apiRequest("/api/v1/facts", {
        method: "POST",
        body: JSON.stringify({
          factId: newId("SIM-FACT"),
          subjectId: detail.case.caseId,
          attribute: "case.entity_resolution_candidate_person_id",
          value: candidateId,
          epistemicStatus: "SYNTHETIC",
          provenance: {
            sourceId,
            recordedAt,
            recordedBy: "LOCAL-CASE-ADMIN",
            note: "Vínculo sintético para análise demonstrativa.",
          },
        }),
      });

      setCandidateDialogOpen(false);
      setNotice("Perfil fictício associado ao caso como possível correspondência.");
      await loadDetail(detail.case.caseId);
    } catch (cause) {
      setError(
        `${cause instanceof Error ? cause.message : "Não foi possível cadastrar o perfil."} As etapas concluídas podem ter sido persistidas; confira o caso antes de repetir.`
      );
    } finally {
      setBusy(false);
    }
  }

  async function compareCandidate(candidate: CandidateItem) {
    if (!detail?.case) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<ComparisonResult>(
        `/api/v1/cases/${encodeURIComponent(detail.case.caseId)}/entity-resolution/compare`,
        {
          method: "POST",
          body: JSON.stringify({
            leftPersonId: detail.case.personId,
            rightPersonId: candidate.personId,
          }),
        }
      );
      setComparisons((current) => ({ ...current, [candidate.personId]: result }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível comparar os perfis.");
    } finally {
      setBusy(false);
    }
  }

  const activeCases = cases.filter((item) => item.workflowStatus === "ACTIVE").length;
  const selectedCase = cases.find((item) => item.caseId === selectedCaseId);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Busca — início">
          <span className="brand-mark">B</span>
          <span>
            <strong>busca</strong>
            <small>INTELIGÊNCIA DE CASOS</small>
          </span>
        </Link>
        <div className="workspace-label">ESPAÇO DE TRABALHO</div>
        <nav className="side-nav" aria-label="Navegação principal">
          <a className="nav-item selected" href="#casos">
            <span aria-hidden="true">▦</span> Casos
          </a>
          <a className="nav-item" href="#pistas" onClick={() => setNotice("Abra um caso para consultar e registrar relatos.")}>
            <span aria-hidden="true">⌕</span> Pistas e relatos
          </a>
        </nav>
        <div className="sidebar-bottom">
          <span className="admin-avatar">A</span>
          <span className="admin-copy"><strong>Administrador</strong><small>Ambiente local</small></span>
          <span className="online-dot" title="Ambiente local" />
        </div>
      </aside>

      <section className="main-column" id="casos">
        <header className="topbar">
          <div className="breadcrumb">Operações <span>/</span> <strong>Casos</strong></div>
          <div className="topbar-right">
            <span className="local-badge"><span /> AMBIENTE LOCAL</span>
            <button className="avatar-button" type="button" aria-label="Administrador">A</button>
          </div>
        </header>

        <div className="workspace-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow">CENTRAL DE OPERAÇÕES</div>
              <h1>Casos de busca</h1>
              <p>Acompanhe registros, organize relatos e analise informações com rastreabilidade.</p>
            </div>
            <button className="button button-primary" type="button" onClick={() => setCaseDialogOpen(true)}>
              <span aria-hidden="true">＋</span> Novo caso
            </button>
          </section>

          <div className="demo-notice">
            <span className="notice-icon" aria-hidden="true">i</span>
            <p><strong>Modo de demonstração.</strong> Use apenas dados fictícios. Esta versão local não possui autenticação institucional e não deve receber informações reais.</p>
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {notice && <div className="alert alert-success" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dispensar aviso">×</button></div>}

          <section className="stats-grid" aria-label="Resumo dos casos">
            <article className="stat-card">
              <span className="stat-icon blue">▦</span>
              <div><span className="stat-label">TOTAL DE CASOS</span><strong>{cases.length}</strong><small>Registros no ambiente local</small></div>
            </article>
            <article className="stat-card">
              <span className="stat-icon green">◷</span>
              <div><span className="stat-label">EM ANDAMENTO</span><strong>{activeCases}</strong><small>Casos ativos</small></div>
            </article>
            <article className="stat-card">
              <span className="stat-icon amber">⌕</span>
              <div><span className="stat-label">RELATOS RECEBIDOS</span><strong>{cases.reduce((total, item) => total + (item.caseId === detail?.case?.caseId ? detail.tips.length : 0), 0)}</strong><small>Do caso selecionado</small></div>
            </article>
          </section>

          <section className="case-panel">
            <div className="panel-heading">
              <div><h2>Todos os casos</h2><p>Registros acessíveis neste ambiente de demonstração.</p></div>
              <button className="button button-quiet" type="button" onClick={() => void loadCases()} disabled={loading}>
                <span aria-hidden="true">↻</span> Atualizar
              </button>
            </div>
            <div className="filter-row">
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Buscar por nome fictício ou código do caso"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Buscar casos"
                />
              </label>
              <span className="result-count">{filteredCases.length} {filteredCases.length === 1 ? "caso" : "casos"}</span>
            </div>

            {loading ? (
              <div className="empty-state"><span className="spinner" />Carregando casos...</div>
            ) : filteredCases.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon" aria-hidden="true">⌕</span>
                <strong>{search ? "Nenhum caso encontrado" : "Nenhum caso cadastrado"}</strong>
                <p>{search ? "Tente outro termo de busca." : "Crie um caso demonstrativo para começar a explorar o fluxo."}</p>
                {!search && <button className="button button-primary" onClick={() => setCaseDialogOpen(true)} type="button">Criar caso de demonstração</button>}
              </div>
            ) : (
              <div className="case-list" role="list">
                {filteredCases.map((item) => (
                  <button
                    className={`case-row ${selectedCaseId === item.caseId ? "active" : ""}`}
                    key={item.caseId}
                    type="button"
                    onClick={() => setSelectedCaseId(item.caseId)}
                    role="listitem"
                  >
                    <span className="case-avatar">{(item.displayName ?? "P").slice(0, 1).toLocaleUpperCase("pt-BR")}</span>
                    <span className="case-main">
                      <strong>{item.displayName ?? "Pessoa sem nome registrado"}</strong>
                      <small>{item.caseId} <span>·</span> {item.personId}</small>
                    </span>
                    <span className={`status-pill ${item.workflowStatus.toLowerCase()}`}>{statusLabel(item.workflowStatus)}</span>
                    <span className="official-status">{statusLabel(item.officialStatus)}</span>
                    <span className="case-date">{formatDate(item.updatedAt)}</span>
                    <span className="row-chevron" aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedCase && (
            <section className="detail-panel" id="pistas">
              <div className="panel-heading detail-heading">
                <div>
                  <div className="eyebrow">FICHA DO CASO</div>
                  <h2>{detail?.case?.displayName ?? selectedCase.displayName ?? "Pessoa sem nome registrado"}</h2>
                  <p>{selectedCase.caseId} <span>·</span> Situação oficial: {statusLabel(selectedCase.officialStatus)}</p>
                </div>
                <div className="detail-actions">
                  <button className="button button-quiet" type="button" onClick={() => setCandidateDialogOpen(true)}>＋ Adicionar possível correspondência</button>
                  <button className="button button-outline" type="button" onClick={() => void analyzeTimeline()} disabled={busy}>◷ Analisar linha do tempo</button>
                  <button className="button button-primary" type="button" onClick={() => setTipDialogOpen(true)}>＋ Registrar relato</button>
                </div>
              </div>
              <div className="detail-grid">
                <article className="detail-card">
                  <div className="detail-card-heading"><h3>Informações registradas</h3><span className="synthetic-tag">SINTÉTICO</span></div>
                  {detail ? (
                    <dl className="fact-list">
                      {detail.facts.filter((fact) => fact.epistemicStatus === "SYNTHETIC" && fact.attribute !== "person.full_name").map((fact) => (
                        <div key={fact.factId}><dt>{factLabel(fact.attribute)}</dt><dd>{fact.attribute === "last_seen.at" || fact.attribute === "last_seen_date" || fact.attribute === "person.birth_date" ? formatDate(String(fact.value)) : String(fact.value)}</dd></div>
                      ))}
                      {detail.facts.length === 0 && <p className="muted">Ainda não há informações registradas.</p>}
                    </dl>
                  ) : <div className="loading-line" />}
                  <p className="epistemic-note">Informações sintéticas para demonstração — não são evidências reais.</p>
                </article>
                <article className="detail-card">
                  <div className="detail-card-heading"><h3>Relatos e pistas</h3><span className="count-tag">{detail?.tips.length ?? "—"}</span></div>
                  {detail ? (
                    detail.tips.length ? (
                      <div className="tip-list">
                        {detail.tips.map((tip) => (
                          <div className="tip-item" key={tip.tipId}>
                            <div className="tip-meta"><span className="unverified-tag">Não verificado</span><time>{formatDate(tip.receivedAt)}</time></div>
                            <p>{tip.originalText}</p>
                            <small>{tip.tipId}</small>
                          </div>
                        ))}
                      </div>
                    ) : <div className="compact-empty">Nenhum relato registrado neste caso.</div>
                  ) : <div className="loading-line" />}
                </article>
                <article className="detail-card candidate-card">
                  <div className="detail-card-heading"><h3>Possíveis correspondências</h3><span className="count-tag">{detail?.candidates.length ?? "—"}</span></div>
                  {detail ? detail.candidates.length ? (
                    <div className="candidate-list">
                      {detail.candidates.map((candidate) => {
                        const result = comparisons[candidate.personId];
                        return (
                          <div className="candidate-item" key={candidate.personId}>
                            <div className="candidate-heading"><span><strong>{candidate.displayName}</strong><small>{candidate.personId}</small></span><button className="button button-quiet" type="button" disabled={busy} onClick={() => void compareCandidate(candidate)}>{result ? "Recomparar" : "Comparar"}</button></div>
                            {result && (
                              <div className="comparison-result">
                                <strong>{result.conclusion === "COMPATIBLE" ? "Compatível — requer revisão humana" : result.conclusion === "INCOMPATIBLE" ? "Incompatibilidades identificadas" : result.conclusion === "REQUIRES_HUMAN_REVIEW" ? "Revisão humana necessária" : "Dados insuficientes"}</strong>
                                <ul>{result.comparisons.filter((item) => item.outcome !== "UNKNOWN").map((item) => <li key={`${item.attribute}-${item.outcome}`}>{item.attribute.replace(/_/g, " ")}: {item.outcome === "MATCH" ? "correspondência" : item.outcome === "PARTIAL_MATCH" ? "correspondência parcial" : "divergência"} <span>· poder discriminatório {item.discriminativePower.toLocaleLowerCase("pt-BR")}</span></li>)}</ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : <div className="compact-empty">Nenhum perfil candidato associado a este caso.</div> : <div className="loading-line" />}
                  <p className="epistemic-note">Comparações são apoio analítico, não confirmação de identidade nem decisão de localização.</p>
                </article>
              </div>
              {timelineResult && (
                <article className="timeline-result">
                  <div className="detail-card-heading">
                    <h3>Análise temporal</h3>
                    <span className="synthetic-tag">{timelineResult.status === "INSUFFICIENT_TEMPORAL_DATA" ? "DADOS INSUFICIENTES" : "ANÁLISE CONCLUÍDA"}</span>
                  </div>
                  <p className="timeline-summary">
                    {timelineResult.events.length} eventos · {timelineResult.relations.length} relações · {timelineResult.gaps.length} lacunas · {timelineResult.contradictions.length} contradições
                  </p>
                  {timelineResult.gaps.map((gap, index) => (
                    <p className="timeline-explanation" key={`${index}-${gap.durationDays ?? "gap"}`}>{gap.explanation}</p>
                  ))}
                  {timelineResult.unresolvedEvents.length > 0 && (
                    <p className="epistemic-note">{timelineResult.unresolvedEvents.length} evento(s) não possuem data resolvida.</p>
                  )}
                  <p className="epistemic-note">A análise organiza dados temporais; não determina localização nem confirma identidade. Lacunas não são, por si só, contradições.</p>
                </article>
              )}
            </section>
          )}
        </div>
        <footer className="footer-note">Busca · MVP local de demonstração <span>•</span> Dados exclusivamente sintéticos</footer>
      </section>

      {caseDialogOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setCaseDialogOpen(false); }}>
          <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-case-title">
            <div className="dialog-heading"><div><div className="eyebrow">NOVO REGISTRO</div><h2 id="new-case-title">Criar caso demonstrativo</h2></div><button className="icon-button" type="button" onClick={() => setCaseDialogOpen(false)} disabled={busy} aria-label="Fechar">×</button></div>
            <p className="dialog-intro">Os campos abaixo devem conter apenas informações inventadas. O sistema marcará os dados como sintéticos.</p>
            <form onSubmit={(event) => void createCase(event)}>
              <label className="form-field">Nome fictício<input name="displayName" required maxLength={120} placeholder="Ex.: Pessoa Exemplo A" /></label>
              <label className="form-field">Último local conhecido (fictício)<input name="lastKnownLocation" required maxLength={255} placeholder="Ex.: Bairro Central, Cidade Exemplo" /></label>
              <label className="form-field">Data do último avistamento<input name="lastSeenDate" type="date" required max={new Date().toISOString().slice(0, 10)} /></label>
              <div className="form-pair">
                <label className="form-field">Data de nascimento fictícia<input name="birthDate" type="date" max={new Date().toISOString().slice(0, 10)} /></label>
                <label className="form-field">Nome fictício da mãe<input name="motherName" maxLength={120} placeholder="Opcional" /></label>
              </div>
              <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={() => setCaseDialogOpen(false)} disabled={busy}>Cancelar</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Salvando..." : "Criar caso"}</button></div>
            </form>
          </section>
        </div>
      )}

      {tipDialogOpen && selectedCase && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setTipDialogOpen(false); }}>
          <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-tip-title">
            <div className="dialog-heading"><div><div className="eyebrow">PISTA DO CASO</div><h2 id="new-tip-title">Registrar relato fictício</h2></div><button className="icon-button" type="button" onClick={() => setTipDialogOpen(false)} disabled={busy} aria-label="Fechar">×</button></div>
            <p className="dialog-intro">O relato será armazenado como não verificado e associado a uma fonte sintética.</p>
            <form onSubmit={(event) => void createTip(event)}>
              <label className="form-field">Conteúdo fictício do relato<textarea name="originalText" required maxLength={10000} rows={5} placeholder="Descreva um exemplo inventado. Não inclua informações reais." /></label>
              <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={() => setTipDialogOpen(false)} disabled={busy}>Cancelar</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Salvando..." : "Registrar relato"}</button></div>
            </form>
          </section>
        </div>
      )}

      {candidateDialogOpen && selectedCase && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setCandidateDialogOpen(false); }}>
          <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-candidate-title">
            <div className="dialog-heading"><div><div className="eyebrow">ANÁLISE DE CORRESPONDÊNCIA</div><h2 id="new-candidate-title">Adicionar perfil candidato</h2></div><button className="icon-button" type="button" onClick={() => setCandidateDialogOpen(false)} disabled={busy} aria-label="Fechar">×</button></div>
            <p className="dialog-intro">Cadastre um perfil inteiramente fictício. A comparação destaca semelhanças e divergências; não confirma identidade.</p>
            <form onSubmit={(event) => void createCandidate(event)}>
              <label className="form-field">Nome fictício<input name="displayName" required maxLength={120} placeholder="Ex.: Candidato Exemplo B" /></label>
              <div className="form-pair">
                <label className="form-field">Data de nascimento fictícia<input name="birthDate" type="date" max={new Date().toISOString().slice(0, 10)} /></label>
                <label className="form-field">Nome fictício da mãe<input name="motherName" maxLength={120} placeholder="Opcional" /></label>
              </div>
              <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={() => setCandidateDialogOpen(false)} disabled={busy}>Cancelar</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Salvando..." : "Associar perfil"}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
