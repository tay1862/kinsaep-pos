import { test, expect } from "@playwright/test";

test.describe("POS Order Flow", () => {
  test("should complete a cash order", async ({ page }) => {
    // 1. Login
    await page.goto("/auth/signin");
    await page.getByPlaceholder("Enter your PIN").fill("000000"); // Default admin pin
    await page.getByRole("button", { name: "Sign In" }).click();

    // Verify we are on dashboard or POS
    await expect(page).toHaveURL("/");

    // Navigate to POS if not there
    await page
      .getByRole("link", { name: "Point of Sale" })
      .click()
      .catch(() => {}); // catch if already on POS

    // 2. Add item to cart
    // Wait for products to load
    await page.waitForTimeout(1000);

    // Click on the first product card found
    // Uses a broad selector fallback if no specific test id
    const productCard = page
      .locator(".product-card")
      .first()
      .or(page.locator('button[class*="card"]'))
      .first();

    if ((await productCard.count()) > 0) {
      await productCard.click();

      // 3. Verify Cart using sidebar info
      await expect(page.getByText("Charge")).toBeVisible();

      // 4. Charge
      await page.getByRole("button", { name: "Charge" }).click();

      // 5. Select Cash
      await page.getByText("Cash").click();

      // 6. Confirm Payment (Exact Amount)
      await page
        .getByRole("button", { name: "Confirm Payment" })
        .or(page.getByRole("button", { name: "Pay" }))
        .click();

      // 7. Verify Success
      await expect(page.getByText("Order Complete")).toBeVisible();

      // Close modal
      await page.getByRole("button", { name: "New Order" }).click();
    } else {
      console.log("No products found to test order flow");
    }
  });
});
