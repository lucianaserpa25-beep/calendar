"use client";
import {
  ArrowUpRight,
  Check,
  CalendarDays,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  type Content,
  type Story,
  type StudioState,
  today,
  dateLabel,
  progress,
  statuses,
  formats,
} from "@/lib/model";
import { ContentCard } from "./board";
export function Dashboard({
  items,
  stories,
  campaign,
  onOpen,
  onNavigate,
}: {
  items: Content[];
  stories: Story[];
  campaign: StudioState["campaigns"][number];
  onOpen: (c: Content) => void;
  onNavigate: (v: string) => void;
}) {
  const day = today(),
    published = items.filter((c) => c.publicationConfirmed),
    late = items.filter((c) => c.date < day && !c.publicationConfirmed),
    upcoming = [...items]
      .filter((c) => c.date >= day && !c.publicationConfirmed)
      .sort((a, b) => a.date.localeCompare(b.date)),
    now = items.filter((c) => c.date === day);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">INTENÇÃO ANTES DE FREQUÊNCIA</span>
          <h1>
            Conteúdo que acolhe.
            <br />
            <em>Presença que conecta.</em>
          </h1>
          <p>
            Um espaço para transformar suas ideias em conversas
            <br className="desktop-only" /> que fazem sentido. Um dia de cada
            vez.
          </p>
          <button className="primary" onClick={() => onNavigate("Meu Dia")}>
            Cuidar do meu dia
            <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-ring" />
          <div className="art-vase" />
          <div className="art-stem stem-one" />
          <div className="art-stem stem-two" />
          <span>
            criar com
            <br />
            <i>propósito.</i>
          </span>
        </div>
      </section>
      <div className="section-title">
        <div>
          <span className="eyebrow">SEU PLANEJAMENTO, EM PERSPECTIVA</span>
          <h2>{campaign.name}</h2>
          <p className="muted small">
            {dateLabel(campaign.start)} a{" "}
            {dateLabel(campaign.end, {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}{" "}
            · America/Sao_Paulo
          </p>
        </div>
        <span className="pill">
          <span className="status-dot" />
          {new Set([...items, ...stories].map((c) => c.date)).size} dias
          planejados
        </span>
      </div>
      <div className="stats">
        {[
          {
            icon: Layers,
            value: items.length,
            label: "Conteúdos planejados",
            detail: `${items.filter((c) => c.format !== "Stories").length} feed · ${items.filter((c) => c.format === "Stories").length} só Stories`,
          },
          {
            icon: Check,
            value: published.length,
            label: "Publicações confirmadas",
            detail: `${items.length ? Math.round((published.length / items.length) * 100) : 0}% do planejamento`,
          },
          {
            icon: CalendarDays,
            value: stories.filter((s) => s.done).length + "/" + stories.length,
            label: "Stories diários concluídos",
            detail: "Uma tarefa independente por dia",
          },
          {
            icon: Clock,
            value: late.length,
            label: "Conteúdos em atraso",
            detail: "Sem confirmação de publicação",
          },
        ].map(({ icon: Icon, value, label, detail }) => (
          <div className="stat" key={label}>
            <div className="between">
              <Icon size={18} strokeWidth={1.5} />
              <span className="stat-label">{label}</span>
            </div>
            <strong>{value}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="between">
            <h2>O processo também conta.</h2>
            <span className="big-percent">{progress(items)}%</span>
          </div>
          <p className="muted">Etapas do checklist concluídas</p>
          <progress max={100} value={progress(items)} />
          <div className="status-summary">
            {statuses.map((s, i) => (
              <button
                className="between"
                key={s}
                onClick={() => onNavigate("Kanban")}
              >
                <span>
                  <span className={`status-dot status-${i}`} />
                  {s}
                </span>
                <strong>{items.filter((c) => c.status === s).length}</strong>
              </button>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="between">
            <h2>Equilíbrio de formatos</h2>
            <Sparkles size={18} />
          </div>
          <p className="muted">Cada formato tem um lugar na conversa.</p>
          <div className="format-summary">
            {formats.map((f) => (
              <div key={f}>
                <div className="between">
                  <span className={`tag format-${f}`}>
                    {f === "Stories" ? "Dias só de Stories" : f}
                  </span>
                  <strong>{items.filter((c) => c.format === f).length}</strong>
                </div>
                <progress
                  max={Math.max(1, items.length)}
                  value={items.filter((c) => c.format === f).length}
                />
              </div>
            ))}
          </div>
          <div className="gentle-note">
            Consistência é presença possível,
            <br />
            <em>não perfeição.</em>
          </div>
        </section>
      </div>
      <div className="section-title">
        <div>
          <span className="eyebrow">
            {now.length ? "PARA HOJE" : "O QUE VEM A SEGUIR"}
          </span>
          <h2>{now.length ? "Sua presença de hoje" : "Próximas conversas"}</h2>
        </div>
        <button className="link" onClick={() => onNavigate("Calendário")}>
          Ver calendário
          <ArrowUpRight size={16} />
        </button>
      </div>
      <div className="cards-grid">
        {(now.length ? now : upcoming).slice(0, 3).map((c) => (
          <ContentCard key={c.id} item={c} onOpen={onOpen} />
        ))}
      </div>
      {!now.length && !upcoming.length && (
        <div className="panel empty">
          Nenhuma publicação futura nesta campanha. Crie um conteúdo para
          continuar.
        </div>
      )}
    </>
  );
}
