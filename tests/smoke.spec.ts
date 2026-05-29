import { test, expect } from "@playwright/test";

test.describe("Sima Arôme SCM Smoke Test", () => {
  test("should load the login page with redirect", async ({ page }) => {
    // Visit the home page (which redirects to /login)
    await page.goto("/");

    // Verify brand display heading is visible
    const brandTitle = page.locator("h1");
    await expect(brandTitle).toBeVisible();
    await expect(brandTitle).toHaveText("Sima Arôme");

    // Verify sub-heading text is visible
    const systemSubheader = page.locator("text=Supply Chain Management System");
    await expect(systemSubheader).toBeVisible();

    // Verify the email field of the login form is present
    const emailInput = page.getByRole("textbox", { name: "Email" });
    await expect(emailInput).toBeVisible();
  });
});
