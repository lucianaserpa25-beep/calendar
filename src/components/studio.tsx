"use client";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Sun,
  Columns3,
  CalendarDays,
  Library,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  Plus,
  Search,
  ArrowUpRight,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  HardDrive,
  Check,
  ChevronRight,
  Flower2,
} from "lucide-react";
import {
  type StudioState,
  type Content,
  type Story,
  statuses,
  formats,
  today,
  dateLabel,
  newContent,
  duplicateContent,
  deleteContent,
} from "@/lib/model";
import { supabase, configured, load, save, type Mode } from "@/lib/storage";
import { Dashboard } from "./dashboard";
import { Board, ContentCard } from "./board";
import { Calendar } from "./calendar";
import { Editor } from "./editor";
import { Results } from "./results";
import { Settings } from "./settings";
const nav = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Meu Dia", icon: Sun },
  { name: "Kanban", icon: Columns3 },
  { name: "Calendário", icon: CalendarDays },
  { name: "Biblioteca", icon: Library },
  { name: "Resultados", icon: ChartNoAxesCombined },
  { name: "Configurações", icon: SettingsIcon },
];
const intros: Record<string, [string, string]> = {
  Dashboard: [
    "Seu conteúdo, com intenção.",
    "Um olhar para o que você está construindo.",
  ],
  "Meu Dia": ["Um dia de cada vez.", "O que merece a sua atenção hoje."],
  Kanban: ["Da intenção à presença.", "Dê espaço para cada etapa da criação."],
  Calendário: [
    "Seu ritmo editorial.",
    "Uma visão clara das próximas conversas.",
  ],
  Biblioteca: [
    "Ideias que ficam.",
    "Roteiros, referências e palavras que conectam.",
  ],
  Resultados: [
    "Além dos números.",
    "Observe o que encontra eco na sua comunidade.",
  ],
  Configurações: [
    "Do seu jeito.",
    "Cuide do seu espaço e da continuidade do seu trabalho.",
  ],
};
export default function Studio() {
  const [state, setState] = useState<StudioState | null>(null),
    [mode, setMode] = useState<Mode>(configured ? "cloud" : "local"),
    [user, setUser] = useState<string | null>(null),
    [boot, setBoot] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState(false),
    [view, setView] = useState("Dashboard"),
    [campaignId, setCampaignId] = useState("luciana-nov-2026"),
    [query, setQuery] = useState(""),
    [format, setFormat] = useState("Todos"),
    [objective, setObjective] = useState("Todos"),
    [status, setStatus] = useState("Todos"),
    [editing, setEditing] = useState<Content | null>(null),
    [mobile, setMobile] = useState(false),
    [email, setEmail] = useState(""),
    [day, setDay] = useState(today());
  const lock = useRef(false),
    revRef = useRef(0);
  useEffect(() => {
    const chosen =
      localStorage.getItem("luciana-local-mode") === "yes"
        ? "local"
        : configured
          ? "cloud"
          : "local";
    setMode(chosen);
    let active = true;
    const init = async () => {
      setBoot(true);
      try {
        if (chosen === "cloud" && supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!active) return;
          setUser(session?.user.email ?? null);
          if (!session) {
            setBoot(false);
            return;
          }
        }
        const snap = await load(chosen);
        if (active) {
          setState(snap.state);
          revRef.current = snap.revision;
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Falha ao abrir o planejamento",
          );
      } finally {
        if (active) setBoot(false);
      }
    };
    void init();
    const { data: auth } = supabase?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT")
        window.location.reload();
    }) ?? { data: null };
    return () => {
      active = false;
      auth?.subscription.unsubscribe();
    };
  }, []);
  const persist = async (next: StudioState): Promise<boolean> => {
    if (lock.current) return false;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      const r = await save(mode, next, revRef.current);
      revRef.current = r;
      setState(next);
      setNotice("Alterações salvas");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar");
      return false;
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  const switchMode = (next: Mode) => {
    if (
      !confirm(
        next === "local"
          ? "Abrir armazenamento separado, somente neste navegador e sem login? Seus dados da nuvem não serão copiados."
          : "Abrir o planejamento privado da nuvem? Seus dados locais continuam neste navegador.",
      )
    )
      return;
    localStorage.setItem("luciana-local-mode", next === "local" ? "yes" : "no");
    location.reload();
  };
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  const navigate = (v: string) => {
    setView(v);
    setMobile(false);
    setQuery("");
    setFormat("Todos");
    setObjective("Todos");
    setStatus("Todos");
  };
  if (boot)
    return (
      <main className="loading">
        <Flower2 size={40} strokeWidth={1} />
        <h1>Luciana Content Studio</h1>
        <p>Preparando seu espaço de criação…</p>
      </main>
    );
  if (!state)
    return (
      <main className="auth-screen">
        <div className="auth-card">
          <Flower2 size={38} strokeWidth={1} />
          <span className="eyebrow">LUCIANA CONTENT STUDIO</span>
          <h1>Seu espaço de criação.</h1>
          <p className="muted">Planejamento privado de @lucianaserpaoficial</p>
          {mode === "cloud" && !user ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                const { error } = await supabase!.auth.signInWithOtp({
                  email,
                  options: {
                    shouldCreateUser: false,
                    emailRedirectTo: location.origin,
                  },
                });
                if (error) setError(error.message);
                else
                  setNotice(
                    "Confira seu e-mail para entrar. Apenas contas previamente convidadas têm acesso.",
                  );
                setSaving(false);
              }}
            >
              <label>
                E-mail convidado
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button className="primary" disabled={saving}>
                Receber link de acesso
                <ArrowUpRight size={16} />
              </button>
            </form>
          ) : (
            <button className="primary" onClick={() => location.reload()}>
              Tentar novamente
            </button>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <p className="muted small">
            Se a nuvem estiver indisponível, você pode usar uma base local
            separada, sem login ou sincronização.
          </p>
          <button className="secondary" onClick={() => switchMode("local")}>
            <HardDrive size={16} />
            Usar somente neste navegador
          </button>
        </div>
      </main>
    );
  const campaign =
      state.campaigns.find((c) => c.id === campaignId) ?? state.campaigns[0],
    campaignItems = state.content.filter((c) => c.campaignId === campaign.id),
    stories = state.stories.filter((s) => s.campaignId === campaign.id),
    items = campaignItems.filter(
      (c) =>
        (format === "Todos" || c.format === format) &&
        (objective === "Todos" || c.objective === objective) &&
        (status === "Todos" || c.status === status) &&
        [c.title, c.script, c.caption, c.cta, c.notes, c.weekTheme].some((v) =>
          v
            .toLocaleLowerCase("pt-BR")
            .includes(query.toLocaleLowerCase("pt-BR")),
        ),
    );
  const upsert = async (c: Content) => {
    const content = state.content.some((x) => x.id === c.id)
      ? state.content.map((x) => (x.id === c.id ? c : x))
      : [...state.content, c];
    let tasks = state.stories.map((s) =>
      s.contentId === c.id &&
      (s.date !== c.date || s.campaignId !== c.campaignId)
        ? { ...s, contentId: null }
        : s,
    );
    if (!tasks.some((s) => s.campaignId === c.campaignId && s.date === c.date))
      tasks = [
        ...tasks,
        {
          id: `story-${crypto.randomUUID()}`,
          campaignId: c.campaignId,
          date: c.date,
          text: c.storyPlan,
          contentId: c.id,
          done: false,
        },
      ];
    return persist({ ...state, content, stories: tasks });
  };
  const create = (date = day) => {
    setEditing(newContent(campaign.id, date, state.preferences.defaultTime));
  };
  const duplicate = async (c: Content) => {
    const copy = duplicateContent(c);
    if (await upsert(copy)) {
      setEditing(null);
      setNotice("Cópia criada na campanha. Abra-a para editar.");
    }
  };
  const remove = async (id: string) => {
    if (await persist(deleteContent(state, id))) setEditing(null);
  };
  const move = async (id: string, to: Content["status"]) => {
    await persist({
      ...state,
      content: state.content.map((c) =>
        c.id === id ? { ...c, status: to } : c,
      ),
    });
  };
  const storySave = async (s: Story) =>
    persist({
      ...state,
      stories: state.stories.map((x) => (x.id === s.id ? s : x)),
    });
  const filtered = !["Dashboard", "Meu Dia", "Configurações"].includes(view);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <div className="brand">
          <Flower2 size={32} strokeWidth={1} />
          <div>
            luciana<span>CONTENT STUDIO</span>
          </div>
          <button
            className="icon mobile-only"
            aria-label="Fechar menu"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <p className="sidebar-caption">Criar. Conectar. Transformar.</p>
        <nav aria-label="Navegação principal">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={view === name ? "active" : ""}
              aria-current={view === name ? "page" : undefined}
              onClick={() => navigate(name)}
            >
              <Icon size={18} strokeWidth={1.5} />
              {name}
              {view === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>
              COM INTENÇÃO,
              <br />
              COM CALMA,
              <br />
              <em>com você.</em>
            </span>
            <Flower2 size={30} strokeWidth={1} />
          </div>
          <div className="profile">
            <span className="avatar">LS</span>
            <div>
              <strong>{state.preferences.name || "Luciana Serpa"}</strong>
              <small>@lucianaserpaoficial</small>
            </div>
            {mode === "cloud" && (
              <button
                className="icon"
                aria-label="Sair"
                onClick={() => supabase?.auth.signOut()}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Fechar navegação"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon mobile-only"
              aria-label="Abrir navegação"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>Meu espaço</span>
            <ChevronRight size={13} />
            <strong>{view}</strong>
          </div>
          <div className="topbar-right">
            <span className="small muted desktop-only">
              {dateLabel(today(), {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="save-state">
              {saving ? (
                "Salvando…"
              ) : (
                <>
                  <Check size={13} />
                  Salvo
                </>
              )}
            </span>
            <span className="avatar small-avatar">LS</span>
          </div>
        </header>
        {mode === "local" && (
          <div className="storage-banner">
            <HardDrive size={15} />
            <span>
              <strong>Modo local.</strong> Dados salvos apenas neste navegador,
              sem login ou sincronização. Exporte um backup nas Configurações.
            </span>
            {configured && (
              <button className="link" onClick={() => switchMode("cloud")}>
                Entrar na nuvem
              </button>
            )}
          </div>
        )}
        <main className="main-content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">@LUCIANASERPAOFICIAL</span>
              <h1>{intros[view][0]}</h1>
              <p className="muted">{intros[view][1]}</p>
            </div>
            <button
              className="primary"
              disabled={saving}
              onClick={() => create()}
            >
              <Plus size={17} />
              Novo conteúdo
            </button>
          </div>
          <div className="campaign-picker">
            <CalendarDays size={16} />
            <select
              aria-label="Campanha ativa"
              value={campaign.id}
              onChange={(e) => {
                setCampaignId(e.target.value);
                setFormat("Todos");
                setObjective("Todos");
                setStatus("Todos");
                setQuery("");
              }}
            >
              {state.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="small muted">
              {campaignItems.length} conteúdos · {stories.length} tarefas de
              Stories
            </span>
          </div>
          {filtered && (
            <div className="filter-bar">
              <label className="search">
                <Search size={17} />
                <input
                  aria-label="Buscar conteúdo"
                  placeholder="Buscar por título, tema ou texto…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Filtrar formato"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="Todos">Todos os formatos</option>
                {formats.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <select
                aria-label="Filtrar objetivo"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              >
                <option value="Todos">Todos os objetivos</option>
                {[...new Set(campaignItems.map((c) => c.objective))]
                  .sort()
                  .map((f) => (
                    <option key={f}>{f}</option>
                  ))}
              </select>
              <select
                aria-label="Filtrar status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Todos">Todos os status</option>
                {statuses.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
              <span className="small muted">{items.length} resultados</span>
            </div>
          )}
          {view === "Dashboard" && (
            <Dashboard
              items={campaignItems}
              stories={stories}
              campaign={campaign}
              onOpen={setEditing}
              onNavigate={navigate}
            />
          )}
          {view === "Kanban" && (
            <Board
              items={items}
              onOpen={setEditing}
              onMove={move}
              disabled={saving}
            />
          )}
          {view === "Calendário" && (
            <Calendar
              key={campaign.id}
              items={items}
              stories={stories}
              initialDate={campaign.start}
              onOpen={setEditing}
              onCreate={create}
            />
          )}
          {view === "Biblioteca" && (
            <>
              <div className="cards-grid">
                {items.map((c) => (
                  <ContentCard key={c.id} item={c} onOpen={setEditing} />
                ))}
              </div>
              {!items.length && (
                <div className="empty panel">
                  Nenhum conteúdo encontrado. Ajuste os filtros ou crie uma
                  ideia.
                </div>
              )}
            </>
          )}
          {view === "Resultados" && (
            <Results
              items={items}
              state={state}
              onImport={persist}
              onOpen={setEditing}
            />
          )}
          {view === "Configurações" && (
            <Settings
              key={campaign.id}
              campaignId={campaign.id}
              state={state}
              mode={mode}
              onSave={persist}
              onSelect={setCampaignId}
            />
          )}
          {view === "Meu Dia" && (
            <>
              <div className="day-picker">
                <label>
                  Dia de criação
                  <input
                    type="date"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  />
                </label>
                <button className="secondary" onClick={() => setDay(today())}>
                  Hoje
                </button>
                <button
                  className="secondary"
                  onClick={() => setDay(campaign.start)}
                >
                  Início da campanha
                </button>
              </div>
              <div className="section-title">
                <h2>
                  {day
                    ? dateLabel(day, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })
                    : "Escolha uma data"}
                </h2>
              </div>
              <div className="cards-grid">
                {campaignItems
                  .filter((c) => c.date === day)
                  .map((c) => (
                    <ContentCard key={c.id} item={c} onOpen={setEditing} />
                  ))}
              </div>
              {!campaignItems.some((c) => c.date === day) && (
                <div className="panel empty">
                  <Sun size={30} strokeWidth={1} />
                  <h3>Um espaço em aberto.</h3>
                  <p>Nenhum conteúdo planejado para esta data.</p>
                  <button
                    className="secondary"
                    disabled={!day || saving}
                    onClick={() => create()}
                  >
                    Planejar conteúdo
                  </button>
                </div>
              )}
              <div className="section-title">
                <h2>Stories do dia</h2>
                <span className="small muted">
                  Independentes da publicação do feed
                </span>
              </div>
              {stories
                .filter((s) => s.date === day)
                .map((s) => (
                  <StoryTask
                    key={s.id}
                    story={s}
                    content={state.content}
                    onSave={storySave}
                    onOpen={setEditing}
                  />
                ))}
              {!stories.some((s) => s.date === day) && (
                <div className="panel">
                  <p className="muted">
                    Ainda não há tarefa de Stories nesta data.
                  </p>
                  <button
                    className="secondary"
                    disabled={!day || saving}
                    onClick={() =>
                      persist({
                        ...state,
                        stories: [
                          ...state.stories,
                          {
                            id: `story-${crypto.randomUUID()}`,
                            campaignId: campaign.id,
                            date: day,
                            text: "",
                            contentId: null,
                            done: false,
                          },
                        ],
                      })
                    }
                  >
                    Criar tarefa diária
                  </button>
                </div>
              )}
              <div className="section-title">
                <h2>
                  {new Set(stories.map((s) => s.date)).size} dias, uma presença
                  de cada vez.
                </h2>
              </div>
              <div className="story-days">
                {[...stories]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setDay(s.date)}
                      className={day === s.date ? "active" : ""}
                    >
                      <span>{dateLabel(s.date)}</span>
                      <small>{s.done ? "✓ Concluído" : "○ A fazer"}</small>
                    </button>
                  ))}
              </div>
            </>
          )}
          <footer className="page-footer">
            <Flower2 size={15} strokeWidth={1} />
            Luciana Content Studio<span>Presença com propósito.</span>
            <span>
              <ShieldCheck size={13} />
              {mode === "cloud" ? "Acesso privado" : "Armazenamento local"}
            </span>
          </footer>
        </main>
      </div>
      {editing && (
        <Editor
          key={editing.id}
          item={editing}
          campaigns={state.campaigns}
          mode={mode}
          onSave={upsert}
          onClose={() => setEditing(null)}
          onDelete={remove}
          onDuplicate={duplicate}
        />
      )}
      {error && (
        <div className="toast error" role="alert">
          <span>{error}</span>
          <button
            className="icon"
            aria-label="Fechar erro"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
    </div>
  );
}
function StoryTask({
  story,
  content,
  onSave,
  onOpen,
}: {
  story: Story;
  content: Content[];
  onSave: (s: Story) => Promise<boolean>;
  onOpen: (c: Content) => void;
}) {
  const [text, setText] = useState(story.text),
    [date, setDate] = useState(story.date),
    [done, setDone] = useState(story.done),
    [busy, setBusy] = useState(false);
  const linked = content.find((c) => c.id === story.contentId);
  return (
    <section className="panel story-task">
      <div className="between">
        <h3>Stories diários</h3>
        <label className="check-line">
          <input
            type="checkbox"
            disabled={busy}
            checked={done}
            onChange={async (e) => {
              const value = e.target.checked;
              setDone(value);
              setBusy(true);
              if (!(await onSave({ ...story, done: value })))
                setDone(story.done);
              setBusy(false);
            }}
          />
          Concluídos
        </label>
      </div>
      <label>
        Planejamento
        <textarea
          aria-label="Planejamento"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <div className="between">
        <label>
          Data da tarefa
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button
          className="secondary"
          disabled={busy || !date}
          onClick={async () => {
            setBusy(true);
            await onSave({ ...story, text, date });
            setBusy(false);
          }}
        >
          Salvar Stories
        </button>
      </div>
      {linked && (
        <button className="link" onClick={() => onOpen(linked)}>
          Abrir conteúdo vinculado
          <ArrowUpRight size={14} />
        </button>
      )}
    </section>
  );
}
