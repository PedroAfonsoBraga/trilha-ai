import { test, expect } from "@playwright/test";

test.describe("Auth Flow", () => {
  const testEmail = `playwright-${Date.now()}@test.com`;
  const testPassword = "teste123456";

  test("signup redirects to onboarding", async ({ page }) => {
    await page.goto("/cadastro");

    await page.fill('input[name="nome"]', "Playwright Test");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"], button:has-text("Criar conta")');

    await page.waitForURL("**/dashboard/onboarding", { timeout: 15000 });

    await expect(page.getByText("Bem-vindo(a)!")).toBeVisible();
    await expect(page.getByText("Concurseiro(a)")).toBeVisible();
  });

  test("onboarding saves perfil and redirects to dashboard", async ({ page }) => {
    await page.goto("/cadastro");

    const uniqueEmail = `playwright-onboarding-${Date.now()}@test.com`;
    await page.fill('input[name="nome"]', "Onboard User");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"], button:has-text("Criar conta")');

    await page.waitForURL("**/dashboard/onboarding", { timeout: 15000 });

    await page.fill('input[name="nome"], #nome', "Onboard User");
    await page.getByText("Concurseiro(a)").click();
    await page.click('button:has-text("Começar a estudar")');

    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await expect(page.getByText("Bem-vindo")).toBeVisible();
  });

  test("onboarding redirects to dashboard if perfil already set", async ({ page }) => {
    await page.goto("/cadastro");

    const uniqueEmail = `playwright-done-${Date.now()}@test.com`;
    await page.fill('input[name="nome"]', "Done User");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"], button:has-text("Criar conta")');

    await page.waitForURL("**/dashboard/onboarding", { timeout: 15000 });
    await page.getByText("Concurseiro(a)").click();
    await page.click('button:has-text("Começar a estudar")');
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    await page.goto("/dashboard/onboarding");
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("login redirects to dashboard", async ({ page }) => {
    await page.goto("/cadastro");

    const uniqueEmail = `playwright-login-${Date.now()}@test.com`;
    await page.fill('input[name="nome"]', "Login User");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"], button:has-text("Criar conta")');
    await page.waitForURL("**/dashboard/onboarding", { timeout: 15000 });
    await page.getByText("Concurseiro(a)").click();
    await page.click('button:has-text("Começar a estudar")');

    const logoutButton = page.getByText("Sair");
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }

    await page.goto("/login");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"], button:has-text("Entrar")');

    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await expect(page.getByText("Bem-vindo")).toBeVisible();
  });
});
