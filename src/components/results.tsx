"use client";
import { useState } from "react";
import { BarChart3, Download, Upload } from "lucide-react";
import {
  type Content,
  type MetricKey,
  metricLabels,
  metricsCSV,
  importMetrics,
  type StudioState,
} from "@/lib/model";
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Results({
  items,
  state,
  onImport,
  onOpen,
}: {
  items: Content[];
  state: StudioState;
  onImport: (s: StudioState) => Promise<boolean>;
  onOpen: (c: Content) => void;
}) {
  const [metric, setMetric] = useState<MetricKey>("reach"),
    [group, setGroup] = useState("Formato"),
    [error, setError] = useState("");
  const groups = new Map<string, { value: number; count: number }>();
  items.forEach((c) => {
    const value = c.metrics?.[metric];
    if (value === null || value === undefined) return;
    const key =
      group === "Formato"
        ? c.format
        : group === "Tema"
          ? c.weekTheme || "Sem tema"
          : c.title;
    const current = groups.get(key) ?? { value: 0, count: 0 };
    groups.set(key, { value: current.value + value, count: current.count + 1 });
  });
  const max = Math.max(1, ...[...groups.values()].map((x) => x.value));
  return (
    <>
      <div className="panel result-intro">
        <div>
          <span className="eyebrow">DADOS COM CONTEXTO</span>
          <h2>Escutar também os resultados.</h2>
          <p className="muted">
            Registro manual. Ausência de coleta aparece como “Sem dados”.
          </p>
        </div>
        <BarChart3 size={42} strokeWidth={1} />
      </div>
      <div className="toolbar">
        <label>
          Métrica
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
          >
            {Object.entries(metricLabels).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Agrupar por
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            {["Formato", "Tema", "Post"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          onClick={() =>
            download(
              "metricas-luciana.csv",
              metricsCSV(state),
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={16} />
          Modelo / exportar CSV
        </button>
        <label className="file-button">
          <Upload size={16} />
          Importar métricas CSV
          <input
            type="file"
            accept=".csv"
            onChange={async (e) => {
              try {
                const file = e.target.files?.[0];
                if (file) {
                  const parsed = importMetrics(state, await file.text());
                  if (
                    confirm(
                      "Aplicar as métricas deste CSV? Campos vazios serão preservados.",
                    )
                  )
                    await onImport(parsed);
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : "CSV inválido");
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="panel chart">
        {groups.size ? (
          [...groups].map(([label, data]) => (
            <div className="chart-row" key={label}>
              <div className="between">
                <span>{label}</span>
                <strong>{data.value.toLocaleString("pt-BR")}</strong>
              </div>
              <div className="bar-track">
                <div style={{ width: `${(data.value / max) * 100}%` }} />
              </div>
              <small>{data.count} conteúdo(s) com coleta</small>
            </div>
          ))
        ) : (
          <div className="empty">
            <BarChart3 size={32} />
            <h3>Ainda não há dados coletados.</h3>
            <p>Abra um conteúdo para registrar suas primeiras métricas.</p>
          </div>
        )}
      </div>
      <div className="list metric-list">
        {items.map((c) => (
          <button className="list-row" key={c.id} onClick={() => onOpen(c)}>
            <span className="grow">{c.title}</span>
            <span className="tag">{c.format}</span>
            <strong>
              {c.metrics?.[metric]?.toLocaleString("pt-BR") ?? "Sem dados"}
            </strong>
          </button>
        ))}
      </div>
      <p className="muted small">
        Metricool: integração futura, ainda não conectada. Nenhum dado é
        consultado automaticamente.
      </p>
    </>
  );
}
