import { test } from "node:test";
import assert from "node:assert/strict";
import raw from "../src/data/luciana_calendario_30_dias_seed.json";
import {
  initialState,
  restoreMissing,
  stateSchema,
  duplicateContent,
  deleteContent,
  progress,
  daysBetween,
  importMetrics,
  metricsCSV,
  parseCSV,
} from "../src/lib/model";
test("seed preserva exatamente os 30 registros e 30 tarefas vinculadas", () => {
  const s = initialState();
  assert.equal(s.content.length, 30);
  assert.equal(s.stories.length, 30);
  assert.deepEqual(s.campaigns[0], raw.campaign);
  for (const f of ["Reel", "Carrossel", "Stories"])
    assert.equal(
      s.content.filter((c) => c.format === f).length,
      { Reel: 12, Carrossel: 10, Stories: 8 }[f],
    );
  for (const original of raw.content) {
    const item = s.content.find((c) => c.id === original.id)!;
    for (const key of Object.keys(original))
      assert.deepEqual(
        item[key as keyof typeof item],
        original[key as keyof typeof original],
      );
    const task = s.stories.find((t) => t.contentId === original.id)!;
    assert.equal(task.text, original.storyPlan);
    assert.equal(task.date, original.date);
  }
  assert.equal(new Set(s.stories.map((s) => s.date)).size, 30);
});
test("seed idempotente não sobrescreve edições", () => {
  const s = initialState();
  s.content[0].title = "Edição da usuária";
  s.content[0].date = "2027-01-01";
  s.stories[0].done = true;
  assert.deepEqual(restoreMissing(s), s);
  s.content.pop();
  const restored = restoreMissing(s);
  assert.equal(restored.content.length, 30);
  assert.equal(restored.content[0].title, "Edição da usuária");
  assert.equal(restored.stories[0].done, true);
});
test("checklist atualiza progresso e mover status não confirma publicação", () => {
  const s = initialState();
  s.content[0].checklist.forEach((c) => (c.done = true));
  assert.equal(progress([s.content[0]]), 100);
  assert.equal(progress(s.content), 3);
  s.content[0].status = "Publicado";
  assert.equal(s.content[0].publicationConfirmed, false);
});
test("duplicar reseta publicação, métricas e checklist; excluir mantém tarefa diária", () => {
  const s = initialState(),
    original = s.content[0];
  original.publicationConfirmed = true;
  original.metrics = { reach: 100 };
  const copy = duplicateContent(original);
  assert.notEqual(copy.id, original.id);
  assert.equal(copy.publicationConfirmed, false);
  assert.equal(copy.metrics, null);
  assert.equal(progress([copy]), 0);
  const deleted = deleteContent(s, original.id);
  assert.equal(deleted.stories.length, 30);
  assert.equal(deleted.stories[0].contentId, null);
});
test("validação rejeita datas impossíveis, IDs duplicados e métricas negativas", () => {
  const s = initialState();
  s.content[0].date = "2026-02-30";
  assert.equal(stateSchema.safeParse(s).success, false);
  s.content[0].date = "2026-11-03";
  s.content.push(s.content[0]);
  assert.equal(stateSchema.safeParse(s).success, false);
  s.content.pop();
  s.content[0].metrics = { reach: -1 };
  assert.equal(stateSchema.safeParse(s).success, false);
});
test("CSV importa métricas conhecidas atomicamente sem inventar zeros", () => {
  const s = initialState(),
    next = importMetrics(s, "id,reach,likes\r\nls-2026-01,123,0");
  assert.equal(next.content[0].metrics?.reach, 123);
  assert.equal(next.content[0].metrics?.likes, 0);
  assert.equal(next.content[0].metrics?.views, undefined);
  assert.equal(s.content[0].metrics, null);
  assert.throws(() => importMetrics(s, "id,reach\nunknown,1"));
  assert.throws(() => importMetrics(s, "id,reach\nls-2026-01,-1"));
  assert.deepEqual(importMetrics(next, metricsCSV(next)), next);
  assert.deepEqual(parseCSV('id,title\n1,"duas, palavras"'), [
    ["id", "title"],
    ["1", "duas, palavras"],
  ]);
});
test("datas da campanha cruzam dezembro sem deslocamento", () => {
  assert.equal(daysBetween("2026-11-03", "2026-12-02").length, 30);
  assert.equal(daysBetween("2028-02-01", "2028-02-29").length, 29);
});
