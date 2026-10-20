import { test, expect } from "@playwright/test";
test("bench runs the model, supports operator actions, charts, and CSV export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The freezing bench" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add mixture", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /Virtual freezing pan/ }),
  ).toHaveAttribute("aria-label", /0 percent modeled frozen/);
  await page.getByRole("button", { name: "Chop / mix" }).click();
  await page.getByRole("button", { name: "Spread", exact: true }).click();
  await page.getByLabel("Target temperature", { exact: true }).fill("-22");
  await page.getByLabel("Simulation speed").selectOption("60");
  await page
    .getByRole("button", { name: "Run simulation", exact: true })
    .click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".big-temperature")).not.toHaveText("-16.0°C");
  await page.getByRole("button", { name: "Power & energy" }).click();
  await expect(page.getByLabel("electrical telemetry chart")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toContain("telemetry.csv");
  await page.getByRole("button", { name: "Scrape batch" }).click();
  await expect(page.locator(".notice")).toContainText("Batch removed");
  await page.getByRole("button", { name: "Reset simulation" }).click();
  await expect(page.locator(".big-temperature")).toHaveText("-16.0°C");
  expect(errors).toEqual([]);
});
test("controllers compare calculated results and perfect-roll trials respond to parameters", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Experiments", exact: true }).click();
  await page
    .getByRole("button", { name: "Compare controllers", exact: false })
    .click();
  await expect(
    page.getByRole("cell", { name: "Electrical energy", exact: true }),
  ).toBeVisible();
  const columns = page
    .locator("tbody tr")
    .filter({ hasText: "Electrical energy" })
    .locator("td");
  expect(await columns.nth(1).textContent()).not.toBe(
    await columns.nth(2).textContent(),
  );
  await page.getByRole("button", { name: "The Perfect Roll Problem" }).click();
  await page
    .getByRole("button", { name: "Run freezing trial", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "#1", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Trial thickness", { exact: true }).fill("6");
  await page
    .getByRole("button", { name: "Run freezing trial", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "#2", exact: true }),
  ).toBeVisible();
  const rows = page.locator("tbody tr");
  expect(await rows.nth(0).locator("td").nth(10).textContent()).not.toBe(
    await rows.nth(1).locator("td").nth(10).textContent(),
  );
});
test("sensor fault affects controls; notebook persists actual executed runs", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sensor lab", exact: true }).click();
  await page
    .getByLabel("Sensor fault", { exact: true })
    .selectOption("disconnected");
  await page.getByLabel("Simulation speed").selectOption("60");
  await page
    .getByRole("button", { name: "Run simulation", exact: true })
    .click();
  await expect(page.locator(".fault-stats")).toContainText("FAULT");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No saved experiments yet." }),
  ).toBeVisible();
  await page
    .getByLabel("Hypothesis", { exact: true })
    .fill("A disconnected sensor inhibits cooling.");
  await page
    .getByLabel("Observations and conclusion")
    .fill("Observed a fault and cooling inhibition in this simulated run.");
  await page.getByRole("button", { name: "Save current bench run" }).click();
  await expect(page.getByRole("status")).toContainText("Saved locally");
  await page.reload();
  await page.getByRole("button", { name: "Notebook", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "A disconnected sensor inhibits cooling." }),
  ).toBeVisible();
});
test("flow components explain equations and mobile layout has no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Under the hood", exact: true })
    .click();
  await page.getByRole("button", { name: /COOL Actuator/ }).click();
  await expect(page.locator(".flow-explanation")).toContainText("Qcool");
  await page
    .getByRole("button", { name: /How electrical energy is calculated/ })
    .click();
  await expect(page.locator(".lesson-body")).toContainText("3600");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Control room", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(
    page.getByRole("button", { name: "Add mixture", exact: true }),
  ).toBeVisible();
});

test("scenario loading, cooling enable, and seeded replay keep explicit state", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Load scenario", { exact: true }).selectOption("rush");
  await expect(page.locator(".notice")).toContainText("After-school rush");
  await page
    .getByRole("button", { name: "Cooling enabled", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cooling disabled", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".notice")).toContainText("Cooling stopped");
  await page.getByLabel("Simulation speed").selectOption("60");
  await page
    .getByRole("button", { name: "Run simulation", exact: true })
    .click();
  await expect(page.locator(".bench-log")).toContainText("Added 120 g", {
    timeout: 5000,
  });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".output-block")).toContainText("OFF / 0%");
  await page.getByLabel("Target temperature", { exact: true }).fill("-25");
  await page.getByRole("button", { name: "Replay seed", exact: true }).click();
  await expect(
    page.getByLabel("Target temperature", { exact: true }),
  ).toHaveValue("-18");
  await expect(page.locator(".big-temperature")).toHaveText("-16.0°C");
  await expect(
    page.getByRole("button", { name: "Cooling enabled", exact: true }),
  ).toBeVisible();
});

test("the pointer scraper removes an actual thermally loaded batch", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add mixture", exact: true }).click();
  const pan = page.getByRole("img", { name: /Virtual freezing pan/ });
  const box = (await pan.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(pan).toHaveAttribute("aria-label", /empty/);
  await expect(page.locator(".notice")).toContainText("Batch removed");
});
