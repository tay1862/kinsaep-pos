import { test, expect } from "@playwright/test";

test("login page loads", async ({ page }) => {
  await page.goto("/auth/signin");
  await expect(page).toHaveTitle(/bnos.space/);
  await expect(page.getByText("Sign in to bnos.space")).toBeVisible();
});

test("login fails with invalid credentials", async ({ page }) => {
  await page.goto("/auth/signin");

  // Select PIN method if not already selected (assuming default may vary)
  // Adjust based on actual UI if needed, but for now assuming PIN is one option

  await page.getByPlaceholder("Enter your PIN").fill("000000");
  await page.getByRole("button", { name: "Sign In" }).click();

  // Expect error message
  await expect(page.getByText("Invalid PIN")).toBeVisible();
});
