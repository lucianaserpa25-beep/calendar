import { test, expect } from "@playwright/test";
const title =
  "Você não é forte o tempo todo. Você aprendeu que não podia depender de ninguém.";
test("seed, edição, checklist, Kanban e Stories persistem após recarregar", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Conteúdo que acolhe." }),
  ).toBeVisible();
  await expect(
    page.getByText("30 conteúdos · 30 tarefas de Stories"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.locator(".content-card")).toHaveCount(30);
  await page.getByLabel("Filtrar formato").selectOption("Reel");
  await expect(page.locator(".content-card")).toHaveCount(12);
  await page.getByLabel("Filtrar formato").selectOption("Carrossel");
  await expect(page.locator(".content-card")).toHaveCount(10);
  await page.getByLabel("Filtrar formato").selectOption("Stories");
  await expect(page.locator(".content-card")).toHaveCount(8);
  await page.getByLabel("Filtrar formato").selectOption("Todos");
  await page.getByRole("heading", { name: title, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Legenda", { exact: true })
    .fill("Legenda editada e persistida.");
  await dialog.getByLabel("Gancho definido", { exact: true }).check();
  await dialog
    .getByRole("button", { name: "Salvar conteúdo", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page.getByRole("heading", { name: title, exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Legenda", { exact: true }),
  ).toHaveValue("Legenda editada e persistida.");
  await expect(
    page.getByRole("dialog").getByLabel("Gancho definido", { exact: true }),
  ).toBeChecked();
  await page.getByLabel("Fechar edição").click();
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await page
    .getByLabel(`Status de ${title}`, { exact: true })
    .selectOption("Publicado");
  await expect(
    page.getByRole("status").filter({ hasText: "Alterações salvas" }),
  ).toContainText("salvas");
  await page.reload();
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await expect(
    page.getByLabel(`Status de ${title}`, { exact: true }),
  ).toHaveValue("Publicado");
  await page.getByRole("heading", { name: title, exact: true }).click();
  await expect(
    page.getByLabel("Confirmo que publiquei este conteúdo no Instagram"),
  ).not.toBeChecked();
  await page.getByLabel("Fechar edição").click();
  await page.getByRole("button", { name: "Meu Dia", exact: true }).click();
  await page
    .getByRole("button", { name: "Início da campanha", exact: true })
    .click();
  await expect(page.getByLabel("Planejamento", { exact: true })).toHaveValue(
    "Enquete: Você tem dificuldade de pedir ajuda?",
  );
  await page.getByLabel("Concluídos", { exact: true }).check();
  await expect(
    page.getByRole("status").filter({ hasText: "Alterações salvas" }),
  ).toContainText("salvas");
  await page.reload();
  await page.getByRole("button", { name: "Meu Dia", exact: true }).click();
  await page
    .getByRole("button", { name: "Início da campanha", exact: true })
    .click();
  await expect(page.getByLabel("Concluídos", { exact: true })).toBeChecked();
});
test("CRUD, busca, calendário, métricas, backup e nova campanha", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Novo conteúdo", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Título", { exact: true })
    .fill("Uma conversa sobre confiança");
  await dialog.getByLabel("Data", { exact: true }).fill("2026-12-02");
  await dialog.getByLabel("Alcance", { exact: true }).fill("1234");
  await dialog
    .getByRole("button", { name: "Salvar conteúdo", exact: true })
    .click();
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page.getByLabel("Buscar conteúdo").fill("conversa sobre confiança");
  await expect(page.locator(".content-card")).toHaveCount(1);
  await page
    .getByRole("heading", { name: "Uma conversa sobre confiança", exact: true })
    .click();
  await page.getByRole("button", { name: "Duplicar", exact: true }).click();
  await expect(page.locator(".content-card")).toHaveCount(2);
  await page
    .getByRole("heading", {
      name: "Uma conversa sobre confiança — cópia",
      exact: true,
    })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Excluir conteúdo", { exact: true }).click();
  await expect(page.locator(".content-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Resultados", exact: true }).click();
  await expect(page.locator(".chart")).toContainText("1.234");
  await page.getByRole("button", { name: "Calendário", exact: true }).click();
  await expect(page.locator(".calendar-item")).toHaveCount(31);
  await page.getByRole("button", { name: "Semana", exact: true }).click();
  await expect(page.locator(".calendar-day")).toHaveCount(7);
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.locator(".list-row")).toHaveCount(31);
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar backup JSON", exact: true })
    .click();
  expect((await download).suggestedFilename()).toContain(".json");
  await page.getByLabel("Nome", { exact: true }).fill("Janeiro com intenção");
  await page.getByLabel("Mês", { exact: true }).fill("2027-01");
  await page
    .getByRole("button", { name: "Criar campanha", exact: true })
    .click();
  await expect(page.getByLabel("Campanha ativa")).toContainText(
    "Janeiro com intenção",
  );
  await expect(
    page.getByText("0 conteúdos · 31 tarefas de Stories"),
  ).toBeVisible();
  await page.reload();
  await page
    .getByLabel("Campanha ativa")
    .selectOption({ label: "Janeiro com intenção" });
  await expect(
    page.getByText("0 conteúdos · 31 tarefas de Stories"),
  ).toBeVisible();
});
test("mobile tem navegação acessível e sem overflow da página", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByText("30 conteúdos · 30 tarefas de Stories"),
  ).toBeAttached();
  await page.getByLabel("Abrir navegação").click();
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await expect(page.locator(".content-card")).toHaveCount(30);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});

test("arrastar no quadro persiste a mudança de etapa", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  const handle = page.getByRole("button", {
    name: `Mover ${title}`,
    exact: true,
  });
  const target = page
    .locator(".board-column")
    .filter({
      has: page.getByRole("heading", { name: "Produção", exact: false }),
    })
    .locator(".column-body");
  await handle.scrollIntoViewIfNeeded();
  const from = await handle.boundingBox(),
    to = await target.boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    from!.x + from!.width / 2 + 12,
    from!.y + from!.height / 2,
    { steps: 4 },
  );
  await page.mouse.move(to!.x + 100, to!.y + 50, { steps: 20 });
  await expect(target.locator("..")).toHaveClass(/over/);
  await page.mouse.up();
  await expect(
    page.getByLabel(`Status de ${title}`, { exact: true }),
  ).toHaveValue("Produção");
  await expect(
    page.getByRole("status").filter({ hasText: "Alterações salvas" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  await expect(
    page.getByLabel(`Status de ${title}`, { exact: true }),
  ).toHaveValue("Produção");
});
test("backup JSON, CSV e anexos locais são realmente importados e persistidos", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page.getByRole("heading", { name: title, exact: true }).click();
  await page.locator("dialog input[type=file]").setInputFiles({
    name: "referencia.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Referência editorial real"),
  });
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "referencia.txt", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar conteúdo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar backup JSON", exact: true })
    .click();
  const file = await event;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream!) chunks.push(c);
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(backup.content[0].attachments[0].data).toContain("data:text/plain");
  backup.content[0].title = "Título importado do backup";
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Alterações salvas" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page
    .getByRole("heading", { name: "Título importado do backup", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "referencia.txt", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Fechar edição").click();
  await page.getByRole("button", { name: "Resultados", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "metricas.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("id,reach,likes\nls-2026-01,456,0"),
  });
  await expect(page.locator(".chart")).toContainText("456");
  await page.reload();
  await page.getByRole("button", { name: "Resultados", exact: true }).click();
  await expect(page.locator(".chart")).toContainText("456");
});
