"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  addDays,
  daysBetween,
  dateLabel,
  type Content,
  type Story,
} from "@/lib/model";
export function Calendar({
  items,
  stories,
  onOpen,
  onCreate,
  initialDate,
}: {
  items: Content[];
  stories: Story[];
  onOpen: (c: Content) => void;
  onCreate: (date: string) => void;
  initialDate: string;
}) {
  const [cursor, setCursor] = useState(initialDate),
    [view, setView] = useState("Mês");
  const first = cursor.slice(0, 7) + "-01",
    start = new Date(first + "T12:00:00Z").getUTCDay(),
    gridStart = addDays(first, -((start + 6) % 7));
  const weekStart = addDays(
    cursor,
    -((new Date(cursor + "T12:00:00Z").getUTCDay() + 6) % 7),
  );
  const days =
    view === "Semana"
      ? daysBetween(weekStart, addDays(weekStart, 6))
      : daysBetween(gridStart, addDays(gridStart, 41));
  const move = (n: number) => {
    if (view === "Semana") {
      setCursor(addDays(cursor, n * 7));
      return;
    }
    const d = new Date(first + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    setCursor(d.toISOString().slice(0, 10));
  };
  return (
    <section>
      <div className="calendar-tools">
        <div className="between calendar-heading">
          <button
            className="icon"
            aria-label="Período anterior"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <h2>{dateLabel(cursor, { month: "long", year: "numeric" })}</h2>
          <button
            className="icon"
            aria-label="Próximo período"
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="segmented">
          {["Mês", "Semana", "Lista"].map((v) => (
            <button
              key={v}
              aria-pressed={view === v}
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {view === "Lista" ? (
        <div className="list">
          {[...items]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((c) => (
              <button className="list-row" key={c.id} onClick={() => onOpen(c)}>
                <span className="list-date">{dateLabel(c.date)}</span>
                <span className="grow">{c.title}</span>
                <span className="tag">{c.format}</span>
                <span className="muted">{c.status}</span>
              </button>
            ))}
          {!items.length && (
            <p className="empty">Nenhum conteúdo para estes filtros.</p>
          )}
        </div>
      ) : (
        <div className="calendar-scroll">
          <div className="calendar-grid">
            {["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((d) => (
              <div className="weekday" key={d}>
                {d}
              </div>
            ))}
            {days.map((day) => (
              <div
                className={`calendar-day ${day.slice(0, 7) !== cursor.slice(0, 7) && view === "Mês" ? "outside" : ""}`}
                key={day}
              >
                <div className="between">
                  <span>{Number(day.slice(-2))}</span>
                  <button
                    className="icon"
                    aria-label={`Criar em ${day}`}
                    onClick={() => onCreate(day)}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                {items
                  .filter((c) => c.date === day)
                  .map((c) => (
                    <button
                      className={`calendar-item format-${c.format}`}
                      key={c.id}
                      onClick={() => onOpen(c)}
                    >
                      <strong>
                        {c.time} · {c.format}
                      </strong>
                      <span>{c.title}</span>
                    </button>
                  ))}
                {stories
                  .filter((s) => s.date === day)
                  .map((s) => (
                    <div className="calendar-story" key={s.id}>
                      {s.done ? "✓" : "○"} Stories diários
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
