import { test, expect, type Page } from "@playwright/test";

const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-Azentio-2026!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Persona").selectOption(email);
  await page.getByLabel("Demo password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in as persona" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test("public visitor sees catalogue but is bounced from portals", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByText("Financial Analysis Intelligence").first()).toBeVisible();
  await page.goto("/client");
  await expect(page).toHaveURL(/\/login/);
  expect((await request.post("/api/aira", { data: { question: "seasonal" } })).status()).toBe(403);
});

test("client sees own workspace, shared feed, AIRA citations", async ({ page }) => {
  await login(page, "analyst@northwind.example");
  await expect(page).toHaveURL(/\/client$/);
  await expect(page.getByRole("heading", { name: "Northwind Bank (synthetic)" })).toBeVisible();
  await page.goto("/learning");
  await expect(page.getByText("Harvest-cycle borrowers need a season-aware baseline")).toBeVisible();
  await page.getByPlaceholder("e.g. seasonal cash flow").fill("seasonal cash flow");
  await page.getByRole("button", { name: "Ask" }).click();
  await expect(page.getByText(/\[1\]/).first()).toBeVisible();
  await page.goto("/employee");
  await expect(page).toHaveURL(/forbidden/);
  await page.goto("/moderation");
  await expect(page).toHaveURL(/forbidden/);
});

test("theme shows distinct org count and limitations", async ({ page }) => {
  await login(page, "user@atlas.example");
  await page.goto("/learning");
  await page.getByRole("link", { name: /Seasonality context/ }).click();
  await expect(page.getByText("Distinct contributing organisations")).toBeVisible();
  await expect(page.getByText("Limitations:")).toBeVisible();
  await expect(page.getByText("Under review").first()).toBeVisible();
});

test("client creates draft → submits → withdraws", async ({ page }) => {
  await login(page, "analyst@northwind.example");
  await page.goto("/client/observations/new");
  await page.getByLabel("Title").fill("E2E test observation on fee sensitivity");
  await page.getByLabel("Observation", { exact: true }).fill("Borrowers in the segment respond strongly to fee changes during renewal periods.");
  await page.getByLabel("Observation period start").fill("2026-01-01");
  await page.getByLabel("Observation period end").fill("2026-03-31");
  await page.getByText("Propose for the learning community").click();
  await page.getByLabel(/Store and process/).check();
  await page.getByLabel(/Publish a moderator-reviewed/).check();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Submitted", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Withdraw" }).click();
  await expect(page.getByText("Withdrawn", { exact: true }).first()).toBeVisible();
});

test("moderator sees queue with sensitivity flags", async ({ page }) => {
  await login(page, "moderator@azentio.com");
  await page.goto("/moderation");
  await page.getByText("Peer comparison lacks sector seasonality filter").click();
  await expect(page.getByText(/Automated scan flagged/)).toBeVisible();
});

test("employee pages work; ordinary employee cannot publish or administer", async ({ page }) => {
  await login(page, "employee@azentio.com");
  await expect(page).toHaveURL(/\/employee$/);
  await page.goto("/employee/playground");
  await page.getByRole("button", { name: "Run" }).first().click();
  await expect(page.getByText(/Simulated output on synthetic data/).first()).toBeVisible();
  for (const p of ["/publisher", "/admin", "/moderation"]) {
    await page.goto(p);
    await expect(page).toHaveURL(/forbidden/);
  }
});
