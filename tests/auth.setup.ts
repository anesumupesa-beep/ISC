import { test as setup, expect } from "@playwright/test";
import { accounts, statePath } from "./roles";

for (const [role, account] of Object.entries(accounts)) {
  setup(`sign in as ${role}`, async ({ page }) => {
    const { email, password } = account();
    await page.goto("/sign-in");
    await page.getByLabel("Email", { exact: false }).fill(email);
    await page.getByLabel("Password", { exact: false }).fill(password);
    await page.getByRole("button", { name: /^(log ?in|sign in)$/i }).click();
    await expect(page).not.toHaveURL(/\/sign-in/);
    await page.context().storageState({ path: statePath(role as keyof typeof accounts) });
  });
}
