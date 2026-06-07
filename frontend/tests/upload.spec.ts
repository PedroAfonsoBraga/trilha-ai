import { test, expect } from "@playwright/test";

test.describe("Upload & Flashcards Flow", () => {
  test("dashboard shows concurso and flashcards cards", async ({ page }) => {
    await page.goto("/login");

    const uniqueEmail = `playwright-upload-${Date.now()}@test.com`;
    await page.goto("/cadastro");
    await page.fill('input[name="nome"]', "Upload User");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "teste123456");
    await page.click('button[type="submit"], button:has-text("Criar conta")');

    await page.waitForURL("**/dashboard/onboarding", { timeout: 15000 });
    await page.getByText("Concurseiro(a)").click();
    await page.click('button:has-text("Começar a estudar")');
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    await expect(page.getByText("Concurso Assistant")).toBeVisible();
    await expect(page.getByText("Flashcards IA")).toBeVisible();
  });

  test("navigate to concurso page from dashboard", async ({ page }) => {
    await page.goto("/login");

    const uniqueEmail = `playwright-nav-${Date.now()}@test.com`;
    await page.goto("/cadastro");
    await page.fill('input[name="nome"]', "Nav User");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "teste123456");
    await page.click('button[type="submit"], button:has-text("Criar conta")');

    await page.waitForURL("**/dashboard/onboarding", { timeout: 15000 });
    await page.getByText("Concurseiro(a)").click();
    await page.click('button:has-text("Começar a estudar")');
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    await page.click('a[href="/dashboard/concurso"]');
    await page.waitForURL("**/dashboard/concurso", { timeout: 10000 });

    await expect(page.getByText("Enviar edital")).toBeVisible();
  });

  test("share page shows not found for invalid token", async ({ page }) => {
    await page.goto("/share/invalid123");

    await expect(page.getByText("Link não encontrado")).toBeVisible();
  });
});
