"use client";
import { useState } from "react";
import { Download, Upload, RotateCcw, Plus, Lock } from "lucide-react";
import {
  stateSchema,
  restoreMissing,
  daysBetween,
  type StudioState,
} from "@/lib/model";
import type { Mode } from "@/lib/storage";
import { download } from "./results";
export function Settings({
  state,
  mode,
  onSave,
  onSelect,
  campaignId,
}: {
  state: StudioState;
  mode: Mode;
  campaignId: string;
  onSave: (s: StudioState) => Promise<boolean>;
  onSelect: (id: string) => void;
}) {
  const [month, setMonth] = useState("2026-12"),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [pref, setPref] = useState(state.preferences);
  return (
    <div className="settings-grid">
      <CampaignEditor
        key={campaignId}
        campaign={
          state.campaigns.find((c) => c.id === campaignId) ?? state.campaigns[0]
        }
        onSave={(c) =>
          onSave({
            ...state,
            campaigns: state.campaigns.map((x) => (x.id === c.id ? c : x)),
          })
        }
      />
      <section className="panel">
        <span className="eyebrow">CONTINUIDADE</span>
        <h2>Uma nova campanha</h2>
        <p className="muted">
          Crie um mês futuro com tarefas diárias de Stories. Os conteúdos do
          feed ficam por sua conta.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const start = month + "-01",
                d = new Date(start + "T12:00:00Z");
              d.setUTCMonth(d.getUTCMonth() + 1);
              d.setUTCDate(0);
              const end = d.toISOString().slice(0, 10),
                id = crypto.randomUUID(),
                campaign = {
                  id,
                  name:
                    name.trim() ||
                    `Plano Editorial — ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d)}`,
                  start,
                  end,
                  timezone: "America/Sao_Paulo" as const,
                  instagram: "@lucianaserpaoficial",
                };
              const next = stateSchema.parse({
                ...state,
                campaigns: [...state.campaigns, campaign],
                stories: [
                  ...state.stories,
                  ...daysBetween(start, end).map((date) => ({
                    id: `story-${id}-${date}`,
                    campaignId: id,
                    date,
                    text: "",
                    contentId: null,
                    done: false,
                  })),
                ],
              });
              if (await onSave(next)) {
                onSelect(id);
                setName("");
              }
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Campanha inválida",
              );
            }
          }}
        >
          <label>
            Nome
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Plano Editorial — Dezembro 2026"
            />
          </label>
          <label>
            Mês
            <input
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <button className="primary">
            <Plus size={16} />
            Criar campanha
          </button>
        </form>
      </section>
      <section className="panel">
        <span className="eyebrow">SEU RITMO</span>
        <h2>Preferências</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSave({ ...state, preferences: pref });
          }}
        >
          <label>
            Como podemos chamar você?
            <input
              value={pref.name}
              onChange={(e) => setPref({ ...pref, name: e.target.value })}
            />
          </label>
          <label>
            Horário padrão de novos conteúdos
            <input
              type="time"
              required
              value={pref.defaultTime}
              onChange={(e) =>
                setPref({ ...pref, defaultTime: e.target.value })
              }
            />
          </label>
          <p className="muted small">
            Idioma: português do Brasil · Fuso: America/Sao_Paulo
          </p>
          <button className="secondary">Salvar preferências</button>
        </form>
      </section>
      <section className="panel">
        <span className="eyebrow">SEUS DADOS</span>
        <h2>Backup e planejamento</h2>
        <p className="muted">
          JSON exporta todas as campanhas, conteúdos, tarefas e métricas.
          Arquivos do Supabase permanecem no bucket privado e precisam de backup
          próprio.
        </p>
        <div className="button-stack">
          <button
            className="secondary"
            onClick={() =>
              download(
                "luciana-content-studio-backup.json",
                JSON.stringify(state, null, 2),
              )
            }
          >
            <Download size={16} />
            Exportar backup JSON
          </button>
          <label className="file-button">
            <Upload size={16} />
            Importar backup JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                try {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const s = stateSchema.parse(JSON.parse(await f.text()));
                  if (
                    confirm(
                      `Substituir todo o planejamento por ${s.content.length} conteúdos e ${s.stories.length} tarefas deste backup? Exporte seus dados atuais antes. Arquivos remotos exigem acesso ao projeto original.`,
                    )
                  )
                    await onSave(s);
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Backup inválido",
                  );
                }
                e.target.value = "";
              }}
            />
          </label>
          <button
            className="secondary"
            onClick={async () => {
              if (
                confirm(
                  "Restaurar os registros ausentes do planejamento inicial? Suas edições serão preservadas; IDs existentes não serão sobrescritos.",
                )
              )
                await onSave(restoreMissing(state));
            }}
          >
            <RotateCcw size={16} />
            Restaurar planejamento inicial
          </button>
        </div>
        <p className="muted small">
          A restauração recupera registros apagados e mantém todas as edições de
          registros existentes.
        </p>
      </section>
      <section className="panel">
        <Lock size={23} strokeWidth={1.5} />
        <h2>Acesso e privacidade</h2>
        <p>
          {mode === "cloud"
            ? "Supabase Auth + banco e arquivos protegidos por RLS."
            : "Modo local: apenas neste navegador, sem autenticação."}
        </p>
        <p className="muted">
          {mode === "cloud"
            ? "Acesso restrito a e-mails convidados na tabela studio_members. Cada conta vê seu próprio planejamento."
            : "Pessoas que utilizam este perfil do navegador podem acessar os dados. Para acesso privado com login e sincronização, configure o Supabase conforme o README."}
        </p>
        <hr />
        <h3>Compromisso editorial</h3>
        <p className="muted">
          Acolher sem diagnosticar. Sem promessas de cura, depoimentos
          inventados ou dados científicos sem fonte. Conversão gentil, com
          respeito à história de cada mulher.
        </p>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function CampaignEditor({
  campaign,
  onSave,
}: {
  campaign: StudioState["campaigns"][number];
  onSave: (c: StudioState["campaigns"][number]) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(campaign),
    [error, setError] = useState("");
  return (
    <section className="panel">
      <span className="eyebrow">CAMPANHA ATIVA</span>
      <h2>O plano é seu.</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const parsed = stateSchema.shape.campaigns.element.parse(draft);
            await onSave(parsed);
            setError("");
          } catch {
            setError("Confira o nome e as datas da campanha.");
          }
        }}
      >
        <label>
          Nome da campanha
          <input
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <div className="field-grid">
          <label>
            Início da campanha
            <input
              type="date"
              required
              value={draft.start}
              onChange={(e) => setDraft({ ...draft, start: e.target.value })}
            />
          </label>
          <label>
            Fim da campanha
            <input
              type="date"
              required
              value={draft.end}
              onChange={(e) => setDraft({ ...draft, end: e.target.value })}
            />
          </label>
        </div>
        <p className="muted small">
          Alterar o período não modifica datas de conteúdos ou tarefas
          existentes. Reprograme cada item no editor.
        </p>
        <button className="secondary">Salvar campanha</button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
