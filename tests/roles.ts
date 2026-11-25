import type { Browser } from "@playwright/test";

function env(prefix: string) {
  return () => {
    const email = process.env[`${prefix}_EMAIL`];
    const password = process.env[`${prefix}_PASSWORD`];
    if (!email || !password) throw new Error(`Set ${prefix}_EMAIL and ${prefix}_PASSWORD`);
    return { email, password };
  };
}

export const accounts = {
  student: env("E2E_STUDENT"),
  isc_admin: env("E2E_ADMIN"),
  welfare_staff: env("E2E_WELFARE"),
};

export const statePath = (role: keyof typeof accounts) => `tests/.auth/${role}.json`;

/** A second signed-in page for another role, alongside the student's own page. */
export async function pageAs(browser: Browser, role: keyof typeof accounts) {
  const context = await browser.newContext({ storageState: statePath(role) });
  return context.newPage();
}
