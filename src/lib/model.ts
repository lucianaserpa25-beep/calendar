import { z } from "zod";
import seed from "@/data/luciana_calendario_30_dias_seed.json";
export const statuses = [
  "Ideias",
  "Roteiro",
  "Produção",
  "Revisão",
  "Agendado",
  "Publicado",
] as const;
export const formats = ["Reel", "Carrossel", "Stories"] as const;
export const metricLabels = {
  reach: "Alcance",
  views: "Visualizações",
  likes: "Curtidas",
  comments: "Comentários",
  saves: "Salvamentos",
  shares: "Compartilhamentos",
  profileVisits: "Visitas ao perfil",
  whatsappClicks: "Cliques no WhatsApp",
  appointments: "Agendamentos atribuídos",
};
export type MetricKey = keyof typeof metricLabels;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Data inválida",
  );
const checklist = z.array(z.object({ label: z.string(), done: z.boolean() }));
const metricSchema = z.object(
  Object.fromEntries(
    Object.keys(metricLabels).map((k) => [
      k,
      z.number().finite().nonnegative().nullable().optional(),
    ]),
  ) as Record<MetricKey, z.ZodOptional<z.ZodNullable<z.ZodNumber>>>,
);
export const contentSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  date,
  format: z.enum(formats),
  title: z.string().min(1),
  objective: z.string(),
  storyPlan: z.string(),
  cta: z.string(),
  week: z.number().optional(),
  weekTheme: z.string().default(""),
  status: z.enum(statuses),
  checklist,
  script: z.string(),
  caption: z.string(),
  priority: z.enum(["Baixa", "Normal", "Alta"]),
  publishedUrl: z.string().nullable(),
  metrics: metricSchema.nullable(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default("09:00"),
  pillar: z.string().default(""),
  notes: z.string().default(""),
  visual: z.string().default(""),
  references: z.string().default(""),
  sources: z.string().default(""),
  publicationConfirmed: z.boolean().default(false),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        data: z.string().optional(),
        path: z.string().optional(),
      }),
    )
    .default([]),
});
export type Content = z.infer<typeof contentSchema>;
export const campaignSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    start: date,
    end: date,
    timezone: z.literal("America/Sao_Paulo"),
    instagram: z.string(),
  })
  .refine((c) => c.start <= c.end, "O fim deve ser após o início");
export const storySchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  date,
  text: z.string(),
  contentId: z.string().nullable(),
  done: z.boolean(),
});
export type Story = z.infer<typeof storySchema>;
export const stateSchema = z
  .object({
    version: z.literal(1),
    campaigns: z.array(campaignSchema).min(1),
    content: z.array(contentSchema),
    stories: z.array(storySchema),
    preferences: z
      .object({
        name: z.string(),
        defaultTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      })
      .default({ name: "Luciana", defaultTime: "09:00" }),
  })
  .superRefine((s, ctx) => {
    for (const key of ["campaigns", "content", "stories"] as const)
      if (new Set(s[key].map((x) => x.id)).size !== s[key].length)
        ctx.addIssue({ code: "custom", message: `IDs duplicados em ${key}` });
    const ids = new Set(s.campaigns.map((x) => x.id)),
      contentIds = new Set(s.content.map((x) => x.id));
    if ([...s.content, ...s.stories].some((x) => !ids.has(x.campaignId)))
      ctx.addIssue({ code: "custom", message: "Campanha inexistente" });
    if (s.stories.some((x) => x.contentId && !contentIds.has(x.contentId)))
      ctx.addIssue({
        code: "custom",
        message: "Stories com vínculo inexistente",
      });
  });
export type StudioState = z.infer<typeof stateSchema>;
export function initialState(): StudioState {
  return stateSchema.parse({
    version: 1,
    campaigns: [seed.campaign],
    content: seed.content,
    stories: seed.content.map((c) => ({
      id: `story-${c.id}`,
      campaignId: c.campaignId,
      date: c.date,
      text: c.storyPlan,
      contentId: c.id,
      done: false,
    })),
  });
}
// Only add missing stable IDs. Existing edits, dates and completion are preserved.
export function restoreMissing(current: StudioState): StudioState {
  const original = initialState();
  return stateSchema.parse({
    ...current,
    ...Object.fromEntries(
      (["campaigns", "content", "stories"] as const).map((k) => [
        k,
        [
          ...current[k],
          ...original[k].filter((x) => !current[k].some((y) => y.id === x.id)),
        ],
      ]),
    ),
  });
}
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function dateLabel(
  v: string,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" },
) {
  return new Intl.DateTimeFormat("pt-BR", {
    ...options,
    timeZone: "America/Sao_Paulo",
  }).format(new Date(v + "T12:00:00-03:00"));
}
export function addDays(v: string, n: number) {
  const d = new Date(v + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(start: string, end: string) {
  const result: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    result.push(d);
    if (result.length > 3660) throw Error("Período muito longo");
  }
  return result;
}
export function progress(items: Content[]) {
  const checks = items.flatMap((c) => c.checklist);
  return checks.length
    ? Math.round((100 * checks.filter((x) => x.done).length) / checks.length)
    : 0;
}
export function newContent(
  campaignId: string,
  day: string,
  time = "09:00",
): Content {
  return contentSchema.parse({
    ...initialState().content[0],
    id: crypto.randomUUID(),
    campaignId,
    date: day,
    title: "Novo conteúdo",
    format: "Reel",
    objective: "Conexão",
    storyPlan: "",
    cta: "",
    status: "Ideias",
    weekTheme: "",
    week: undefined,
    time,
  });
}
export function duplicateContent(c: Content): Content {
  return {
    ...structuredClone(c),
    id: crypto.randomUUID(),
    title: c.title + " — cópia",
    status: "Ideias",
    publicationConfirmed: false,
    publishedUrl: null,
    metrics: null,
    checklist: c.checklist.map((x) => ({ ...x, done: false })),
  };
}
export function deleteContent(s: StudioState, id: string): StudioState {
  return {
    ...s,
    content: s.content.filter((c) => c.id !== id),
    stories: s.stories.map((t) =>
      t.contentId === id ? { ...t, contentId: null } : t,
    ),
  };
}
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  const str = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '"') {
      if (quoted && str[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && str[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("CSV com aspas não fechadas");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function importMetrics(s: StudioState, text: string): StudioState {
  const [headers, ...rows] = parseCSV(text);
  if (!headers || headers[0] !== "id")
    throw Error("A primeira coluna deve ser id");
  const keys = headers.slice(1);
  if (
    !keys.length ||
    keys.some((k) => !(k in metricLabels)) ||
    new Set(headers).size !== headers.length
  )
    throw Error("Colunas inválidas. Use o modelo CSV.");
  const next = structuredClone(s);
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.length !== headers.length)
      throw Error("Quantidade de colunas inválida");
    const c = next.content.find((c) => c.id === row[0]);
    if (!c || seen.has(row[0]))
      throw Error(`ID inexistente ou repetido: ${row[0]}`);
    seen.add(row[0]);
    keys.forEach((k, i) => {
      const raw = row[i + 1].trim();
      if (raw === "") return;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0)
        throw Error(`Métrica inválida em ${row[0]}`);
      c.metrics ??= {};
      c.metrics[k as MetricKey] = n;
    });
  }
  if (!rows.length) throw Error("CSV sem registros");
  return stateSchema.parse(next);
}
export function metricsCSV(s: StudioState) {
  const keys = Object.keys(metricLabels) as MetricKey[];
  return [
    ["id", ...keys],
    ...s.content.map((c) => [c.id, ...keys.map((k) => c.metrics?.[k] ?? "")]),
  ]
    .map((r) => r.join(","))
    .join("\n");
}
