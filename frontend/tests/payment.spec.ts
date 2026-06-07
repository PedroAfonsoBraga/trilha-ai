import { test, expect } from "@playwright/test";

test.describe("Payment Flow", () => {
  test("pricing section shows plans", async ({ page }) => {
    await page.goto("/");

    // Scroll to pricing
    await page.getByText("Planos").first().scrollIntoViewIfNeeded();
    await expect(page.getByText("Gratuito")).toBeVisible();
    await expect(page.getByText("Estudante")).toBeVisible();
    await expect(page.getByText("Pro")).toBeVisible();
  });

  test("dashboard checkout buttons exist", async ({ page }) => {
    const uniqueEmail = `playwright-payment-${Date.now()}@test.com`;
    await page.goto("/cadastro");
    await page.fill('input[name="nome"]', "Payment User");
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', "teste123456");
    await page.click('button[type="submit"], button:has-text("Criar conta")');

    await page.waitForURL("**/dashboard/onboarding", { timeout: 15000 });
    await page.getByText("Concurseiro(a)").click();
    await page.click('button:has-text("Começar a estudar")');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });
});
