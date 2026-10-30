import { test, expect, type Page } from "@playwright/test";

// Every page must fit its viewport with no sideways scrolling, from small phones to desktop.
const VIEWPORTS = [
  { name: "phone-320", width: 320, height: 640 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
];
const PUBLIC = ["/", "/products", "/products/riva", "/solutions", "/technology", "/lab", "/live", "/media", "/insights", "/about", "/connect", "/hackathon/register", "/login"];
const CLIENT = ["/client", "/client/observations", "/client/observations/new", "/client/sandbox", "/client/support", "/client/resources", "/learning", "/notifications"];
const EMPLOYEE = ["/employee", "/employee/playground", "/employee/ideas", "/employee/federated", "/employee/knowledge", "/employee/experiments", "/moderation"];
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-Azentio-2026!";

async function overlaps(page: Page) {
  // a button covered by another element means part of the layout spilled out of its column
  return page.evaluate(() => [...document.querySelectorAll("main button, main a")].filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) return false;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit && !el.contains(hit) && !hit.contains(el) && !hit.closest("header, [role=dialog], button[aria-haspopup]");
  }).slice(0, 3).map((el) => el.textContent?.trim().slice(0, 30)));
}

async function overflow(page: Page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= w + 1) return [];
    return [...document.querySelectorAll("body *")]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && getComputedStyle(el).position !== "fixed"; })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")}`);
  });
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Persona").selectOption(email);
  await page.getByLabel("Demo password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in as persona" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    // phones and tablets are emulated as touch devices (as on a real iPhone/iPad), desktops with a mouse
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.width < 1100, isMobile: vp.width < 1100 });

    test("public pages fit the screen", async ({ page }) => {
      for (const path of PUBLIC) {
        await page.goto(path);
        expect(await overflow(page), `${path} at ${vp.width}px`).toEqual([]);
        expect(await overlaps(page), `covered controls on ${path} at ${vp.width}px`).toEqual([]);
      }
    });

    test("client pages fit the screen, AIRA opens", async ({ page }) => {
      await login(page, "analyst@northwind.example");
      for (const path of CLIENT) {
        await page.goto(path);
        expect(await overflow(page), `${path} at ${vp.width}px`).toEqual([]);
        expect(await overlaps(page), `covered controls on ${path} at ${vp.width}px`).toEqual([]);
      }
      await page.getByRole("button", { name: "Ask AIRA" }).click();
      const dialog = page.getByRole("dialog", { name: "AIRA assistant" });
      await expect(dialog).toBeVisible();
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
    });

    test("employee pages fit the screen", async ({ page }) => {
      await login(page, "moderator@azentio.com");
      for (const path of EMPLOYEE) {
        await page.goto(path);
        expect(await overflow(page), `${path} at ${vp.width}px`).toEqual([]);
        expect(await overlaps(page), `covered controls on ${path} at ${vp.width}px`).toEqual([]);
      }
    });
  });
}
