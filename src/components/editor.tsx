"use client";
import { useEffect, useRef, useState } from "react";
import { X, Paperclip, Trash2, Copy, Check, ExternalLink } from "lucide-react";
import {
  type Content,
  type StudioState,
  statuses,
  formats,
  metricLabels,
  type MetricKey,
  progress,
} from "@/lib/model";
import { attach, attachmentURL, type Mode } from "@/lib/storage";
export function Editor({
  item,
  campaigns,
  mode,
  onSave,
  onClose,
  onDelete,
  onDuplicate,
}: {
  item: Content;
  campaigns: StudioState["campaigns"];
  mode: Mode;
  onSave: (c: Content) => Promise<boolean>;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (c: Content) => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => structuredClone(item)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const update = <K extends keyof Content>(key: K, value: Content[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const close = () => {
    if (busy) return;
    if (
      JSON.stringify(draft) !== JSON.stringify(item) &&
      !confirm("Descartar alterações ainda não salvas?")
    )
      return;
    onClose();
  };
  const save = async () => {
    if (!draft.title.trim() || !draft.date) {
      setError("Preencha título e data.");
      return;
    }
    setBusy(true);
    if (await onSave(draft)) onClose();
    else
      setError(
        "Não foi possível salvar. Verifique a conexão ou recarregue para resolver um conflito de edição.",
      );
    setBusy(false);
  };
  return (
    <dialog
      ref={ref}
      className="editor"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-labelledby="editor-title"
    >
      <div className="drawer-head">
        <div>
          <span className="eyebrow">ATELIÊ DE CONTEÚDO</span>
          <h2 id="editor-title">Cada ideia merece cuidado.</h2>
        </div>
        <button className="icon" onClick={close} aria-label="Fechar edição">
          <X />
        </button>
      </div>
      <div className="drawer-body">
        <label>
          Título
          <textarea
            aria-label="Título"
            rows={3}
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </label>
        <div className="field-grid">
          <label>
            Data
            <input
              aria-label="Data"
              type="date"
              value={draft.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </label>
          <label>
            Horário · São Paulo
            <input
              type="time"
              value={draft.time}
              onChange={(e) => update("time", e.target.value)}
            />
          </label>
          <label>
            Formato
            <select
              aria-label="Formato"
              value={draft.format}
              onChange={(e) =>
                update("format", e.target.value as Content["format"])
              }
            >
              {formats.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              aria-label="Status"
              value={draft.status}
              onChange={(e) =>
                update("status", e.target.value as Content["status"])
              }
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Objetivo
            <input
              value={draft.objective}
              onChange={(e) => update("objective", e.target.value)}
            />
          </label>
          <label>
            Prioridade
            <select
              aria-label="Prioridade"
              value={draft.priority}
              onChange={(e) =>
                update("priority", e.target.value as Content["priority"])
              }
            >
              {["Baixa", "Normal", "Alta"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Pilar
            <input
              value={draft.pillar}
              onChange={(e) => update("pillar", e.target.value)}
            />
          </label>
          <label>
            Tema
            <input
              value={draft.weekTheme}
              onChange={(e) => update("weekTheme", e.target.value)}
            />
          </label>
        </div>
        <label>
          Campanha
          <select
            aria-label="Campanha"
            value={draft.campaignId}
            onChange={(e) => update("campaignId", e.target.value)}
          >
            {campaigns.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <section className="editor-section">
          <div className="between">
            <h3>Checklist de criação</h3>
            <span>{progress([draft])}%</span>
          </div>
          <progress max={100} value={progress([draft])} />
          <div className="checks">
            {draft.checklist.map((c, i) => (
              <label key={i}>
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={(e) => {
                    const done = e.target.checked;
                    setDraft((d) => ({
                      ...d,
                      checklist: d.checklist.map((x, j) =>
                        j === i ? { ...x, done } : x,
                      ),
                      ...(c.label === "Publicação confirmada"
                        ? { publicationConfirmed: done }
                        : {}),
                    }));
                  }}
                />
                {c.label}
              </label>
            ))}
          </div>
        </section>
        {(
          [
            ["storyPlan", "Stories planejados"],
            ["script", "Roteiro"],
            ["caption", "Legenda"],
            ["cta", "CTA"],
            ["visual", "Orientações visuais"],
            ["references", "Referências de benchmark e links"],
            ["sources", "Fontes"],
            ["notes", "Notas"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea
              aria-label={label}
              rows={key === "script" || key === "caption" ? 5 : 2}
              value={draft[key]}
              onChange={(e) => update(key, e.target.value)}
            />
          </label>
        ))}
        <section className="editor-section">
          <h3>Publicação</h3>
          <p className="muted">
            Mover para “Publicado” organiza o quadro. Nenhuma ação aqui publica
            no Instagram.
          </p>
          <label>
            URL publicada
            <input
              type="url"
              placeholder="https://www.instagram.com/p/..."
              value={draft.publishedUrl ?? ""}
              onChange={(e) => update("publishedUrl", e.target.value || null)}
            />
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={draft.publicationConfirmed}
              onChange={(e) => {
                const done = e.target.checked;
                setDraft((d) => ({
                  ...d,
                  publicationConfirmed: done,
                  checklist: d.checklist.map((c) =>
                    c.label === "Publicação confirmada" ? { ...c, done } : c,
                  ),
                }));
              }}
            />
            Confirmo que publiquei este conteúdo no Instagram
          </label>
        </section>
        <section className="editor-section">
          <h3>Arquivos e imagens</h3>
          <p className="muted">
            Até 5 MB por arquivo. No modo local, o backup JSON inclui os
            arquivos.
          </p>
          <label className="file-button">
            <Paperclip size={16} />
            Anexar arquivo
            <input
              type="file"
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                try {
                  const a = await attach(f, mode);
                  setDraft((d) => ({
                    ...d,
                    attachments: [...d.attachments, a],
                  }));
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Erro ao anexar");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          {draft.attachments.map((a) => (
            <div className="between attachment" key={a.id}>
              <button
                className="link"
                onClick={async () => {
                  try {
                    const url = await attachmentURL(a);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = a.name;
                    link.click();
                    if (url.startsWith("blob:"))
                      setTimeout(() => URL.revokeObjectURL(url), 30000);
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Arquivo indisponível",
                    );
                  }
                }}
              >
                {a.name}
                <ExternalLink size={13} />
              </button>
              <button
                className="icon"
                aria-label={`Remover ${a.name}`}
                onClick={() =>
                  update(
                    "attachments",
                    draft.attachments.filter((x) => x.id !== a.id),
                  )
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </section>
        <section className="editor-section">
          <h3>Resultados coletados</h3>
          <p className="muted">Deixe em branco o que ainda não foi coletado.</p>
          <div className="field-grid">
            {(Object.entries(metricLabels) as [MetricKey, string][]).map(
              ([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    min="0"
                    value={draft.metrics?.[key] ?? ""}
                    onChange={(e) =>
                      update("metrics", {
                        ...draft.metrics,
                        [key]:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              ),
            )}
          </div>
        </section>
        <p className="muted small">ID: {draft.id}</p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
      <footer className="drawer-footer">
        <button
          className="icon danger"
          disabled={busy}
          aria-label="Excluir conteúdo"
          onClick={async () => {
            if (
              confirm(
                "Excluir este conteúdo? A tarefa diária de Stories será preservada.",
              )
            ) {
              setBusy(true);
              await onDelete(item.id);
              setBusy(false);
            }
          }}
        >
          <Trash2 size={18} />
        </button>
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onDuplicate(draft);
            setBusy(false);
          }}
        >
          <Copy size={15} />
          Duplicar
        </button>
        <button className="primary" disabled={busy} onClick={save}>
          <Check size={16} />
          {busy ? "Salvando…" : "Salvar conteúdo"}
        </button>
      </footer>
    </dialog>
  );
}
