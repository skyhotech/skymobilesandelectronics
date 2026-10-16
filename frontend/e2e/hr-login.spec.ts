import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce", trace: "off", screenshot: "off", video: "off" });
test("separate HR login authenticates only an HR account and protects the workspace", async ({ page, baseURL }) => {
  test.setTimeout(90000);
  test.skip(!process.env.SKY_HR_TESTS || !["localhost", "127.0.0.1"].includes(new URL(baseURL!).hostname), "Requires explicitly enabled local HR fixture test");
  const backend = path.resolve("../backend");
  const username = `qa-hr-${Date.now()}`;
  const env = { ...process.env, SKY_HR_TEST_USERNAME: username, SKY_HR_TEST_PASSWORD: randomBytes(24).toString("hex") };
  const run = (script: string) => execFileSync(path.join(backend, ".venv/Scripts/python.exe"), ["manage.py", "shell", "-c", script], { cwd: backend, env, stdio: "pipe" }).toString();
  const setup = run("import os; from django.contrib.auth.models import User,Group; group,created=Group.objects.get_or_create(name='HR'); user=User.objects.create_user(username=os.environ['SKY_HR_TEST_USERNAME'],password=os.environ['SKY_HR_TEST_PASSWORD']); user.groups.add(group); print('HR_GROUP_CREATED:'+str(created))");
  try {
    await page.goto("/hr");
    await expect(page).toHaveURL(/\/hr\/login\?next=/);
    await expect(page.getByRole("heading", { name: "HR sign in", exact: true })).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading page", exact: true })).toHaveCount(0);
    await page.getByLabel("Username", { exact: true }).fill(username);
    await page.getByLabel("Password", { exact: true }).fill(env.SKY_HR_TEST_PASSWORD);
    await page.getByRole("button", { name: "Show password", exact: true }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password", exact: true }).click();
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/hr$/);
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width >= 768) {
        const sidebar = await page.locator("aside").filter({ has: page.getByRole("navigation", { name: "HR navigation" }) }).boundingBox();
        expect(sidebar!.width / width).toBeCloseTo(0.2, 2);
      }
    }
    await expect(page.getByText(`Signed in as ${username}.`, { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "HR statistics" })).toBeVisible();
    await expect(page.getByRole("region", { name: "HR sections" }).getByRole("article")).toHaveCount(8);
    await expect(page.getByRole("heading", { name: "Branches by city", exact: true })).toBeVisible();
    const search = page.getByRole("searchbox", { name: "Search HR", exact: true });
    await search.fill("STAFF");
    await expect(page.getByRole("navigation", { name: "HR search results" }).getByRole("link", { name: "Employees", exact: true })).toBeVisible();
    await page.getByLabel("Filter HR search", { exact: true }).selectOption("/hr/hiring");
    await expect(page.getByText("No matching sections. Try staff, interview or alerts.")).toBeVisible();
    await search.fill("INTERVIEW");
    await expect(page.getByRole("navigation", { name: "HR search results" }).getByRole("link", { name: "Hiring Process", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear search and filters", exact: true }).click();
    await expect(page.getByLabel("Current India time", { exact: true })).not.toHaveText("Loading time...");
    const clock = await page.getByLabel("Current India time", { exact: true }).getAttribute("datetime");
    await expect(page.getByLabel("Current India time", { exact: true })).not.toHaveAttribute("datetime", clock!);
    expect(await page.locator("header").evaluate(element => getComputedStyle(element.parentElement!).position)).toBe("sticky");
    await page.locator("summary").filter({ hasText: "Employees" }).click();
    await page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: "All", exact: true }).click();
    await expect(page.getByRole("heading", { name: "All employees", exact: true })).toBeVisible();
    for (const [label, status, heading] of [["Working", "working", "Working employees"], ["Leave", "leave", "Employees on leave"], ["Past Employees", "past", "Past employees"]]) {
      await page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`status=${status}$`));
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    }
    await expect(page).toHaveURL(/\/hr\/employees\?status=past$/);
    await expect(page.getByRole("heading", { name: "Employees", exact: true })).toBeVisible();
    await expect(page.locator("details")).toHaveAttribute("open", "");
    await expect(page.getByText("Employee records are not connected yet.", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Attendance", exact: true }).click();
    await expect(page).toHaveURL(/\/hr\/attendance$/);
    await expect(page.getByRole("heading", { name: "Attendance", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Attendance", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Attendance records are not connected yet.", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Hiring Process", exact: true }).click();
    await expect(page).toHaveURL(/\/hr\/hiring$/);
    await expect(page.getByRole("heading", { name: "Hiring Process", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Hiring Process", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Hiring records are not connected yet.", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Broadcast Notifications", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Broadcast Notifications", exact: true })).toBeVisible();
    await page.getByLabel("Title", { exact: true }).fill(username);
    await page.getByLabel("Message", { exact: true }).fill("Local HR broadcast verification");
    await page.getByRole("button", { name: "Send broadcast", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Broadcast sent to the HR notification feed." })).toBeVisible();
    await expect(page.getByRole("heading", { name: username, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enable browser notifications", exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: "Manage Branches", exact: true }).click();
    await expect(page).toHaveURL(/\/hr\/branches$/);
    await expect(page.getByRole("heading", { name: "Manage Branches", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Branch directory", exact: true })).toBeVisible();
    await expect(page.getByLabel("Search branches or cities", { exact: true })).toBeVisible();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator("form").filter({ has: page.getByLabel("Search branches or cities", { exact: true }) }).evaluate(element => window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top + 500, behavior: "instant" }));
      await expect.poll(() => page.locator("form").filter({ has: page.getByLabel("Search branches or cities", { exact: true }) }).evaluate(element => { window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top + 500, behavior: "instant" }); return Math.abs(element.getBoundingClientRect().top - Number.parseFloat(getComputedStyle(element).top)); })).toBeLessThan(2);
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.getByRole("button", { name: "Add branch", exact: true }).click();
    await page.getByLabel("Branch name", { exact: true }).fill(username);
    await page.getByLabel("Branch code", { exact: true }).fill(username);
    await page.getByLabel("City", { exact: true }).fill("Test city");
    await page.getByLabel("Google Maps link", { exact: true }).fill("https://www.google.com/maps/search/?api=1&query=Test");
    const panorama = "https://www.google.com/maps/embed?pb=test-only-panorama";
    await page.context().route("**/maps/embed?pb=test-only-panorama", route => route.fulfill({ contentType: "text/html", body: "<p>Test-only panorama iframe fixture</p>" }));
    await page.getByLabel("Street View embed URL or iframe", { exact: true }).fill(`<iframe src="${panorama}"></iframe>`);
    await page.getByRole("button", { name: "Save branch", exact: true }).click();
    await expect(page.getByText("Branch saved.", { exact: true })).toBeVisible();
    await page.getByLabel("Search branches or cities", { exact: true }).fill(username);
    await page.getByRole("button", { name: "Search branches", exact: true }).click();
    const locatorPage = await page.context().newPage();
    await locatorPage.goto("/", { waitUntil: "domcontentloaded" });
    const locator = locatorPage.getByRole("region", { name: "Find your nearest store", exact: true });
    await expect(locator.locator("iframe")).toHaveAttribute("src", /1CKN57mmNV4leZOg8TogGsFTtWhoMf04/);
    await locator.getByLabel("Search stores", { exact: true }).fill(username);
    await expect(locator.getByRole("heading", { name: username, exact: true })).toBeVisible();
    await expect(locator.getByRole("link", { name: "Get directions", exact: true })).toHaveAttribute("href", "https://www.google.com/maps/dir/?api=1&destination=Test&dir_action=navigate");
    await expect(locator.locator(`iframe[src="${panorama}"]`)).toHaveCount(0);
    await expect(locator.getByRole("button", { name: "Explore in 360", exact: true })).toHaveCount(0);
    for (const width of [390, 1440]) {
      await locatorPage.setViewportSize({ width, height: 900 });
      await expect.poll(() => locatorPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole("button", { name: `View ${username}`, exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Branch details", exact: true })).toContainText("Test city");
    await page.getByRole("dialog", { name: "Branch details", exact: true }).getByRole("button", { name: "Preview 360 Street View", exact: true }).click();
    await expect(page.getByRole("dialog", { name: `${username} - 360 Street View`, exact: true }).locator(`iframe[src="${panorama}"]`)).toBeVisible();
    await page.getByRole("button", { name: "Close viewer", exact: true }).click();
    const review = page.getByRole("region", { name: "Street View management", exact: true });
    await review.getByLabel("Verification note", { exact: true }).fill("Test-only panorama fixture inspected for this isolated test branch.");
    await review.getByLabel("I visually checked this exact branch location or storefront panorama", { exact: true }).check();
    await review.getByRole("button", { name: "Confirm storefront panorama", exact: true }).click();
    await expect(review.getByText("storefront verified", { exact: true })).toBeVisible();
    await locator.getByRole("button", { name: "Explore in 360", exact: true }).click();
    await expect(locator.locator(`iframe[src="${panorama}"]`)).toBeVisible();
    for (const width of [390, 768, 1024, 1440]) {
      await locatorPage.setViewportSize({ width, height: 900 });
      const panoramaDialog = locatorPage.getByRole("dialog", { name: `${username} - 360 Street View`, exact: true });
      const box = await panoramaDialog.boundingBox();
      expect(box!.width).toBeLessThanOrEqual(width);
      await expect(panoramaDialog.locator("iframe")).toHaveAttribute("allowfullscreen", "");
    }
    await locatorPage.keyboard.press("Escape");
    await expect(locatorPage.getByRole("dialog", { name: `${username} - 360 Street View`, exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: `Edit ${username}`, exact: true }).click();
    await page.getByLabel("City", { exact: true }).fill("Updated city");
    await page.getByLabel("Google Maps link", { exact: true }).fill("https://www.google.com/maps/search/?api=1&query=Updated");
    await page.getByRole("button", { name: "Save branch", exact: true }).click();
    await expect(page.getByText("Branch saved.", { exact: true })).toBeVisible();
    await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: username, exact: true }) })).toContainText("Updated city");
    await expect(locator.getByRole("link", { name: "Get directions", exact: true })).toHaveAttribute("href", "https://www.google.com/maps/dir/?api=1&destination=Updated&dir_action=navigate");
    await expect(locator.getByRole("button", { name: "Explore in 360", exact: true })).toHaveCount(0);
    const hrCard = page.getByRole("article").filter({ has: page.getByRole("heading", { name: username, exact: true }) });
    await expect(hrCard.getByRole("link", { name: "Get directions", exact: true })).toHaveAttribute("href", "https://www.google.com/maps/dir/?api=1&destination=Updated&dir_action=navigate");
    await locatorPage.close();
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: `Delete ${username}`, exact: true }).click();
    await expect(page.getByText("Branch deleted.", { exact: true })).toBeVisible();

    await expect(page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: "Manage Branches", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: "Leave Requests", exact: true }).click();
    await expect(page).toHaveURL(/\/hr\/leave-requests$/);
    await expect(page.getByRole("heading", { name: "Leave Requests", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: "Leave Requests", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Leave requests are not connected yet.", { exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: "Careers", exact: true }).click();
    await page.getByLabel("Job title", { exact: true }).fill(username);
    await page.getByLabel("Location", { exact: true }).fill("Chennai");
    await page.getByLabel("Description", { exact: true }).fill("Help customers choose electronics.");
    await page.getByLabel("Application email", { exact: true }).fill("jobs@example.com");
    await page.getByRole("button", { name: "Create opening", exact: true }).click();
    await expect(page.getByText("Job opening saved.", { exact: true })).toBeVisible();
    const publicPage = await page.context().newPage();
    const legacy = await page.request.get("/carrears?page=2", { maxRedirects: 0 });
    expect(legacy.status()).toBe(308);
    expect(new URL(legacy.headers().location).pathname + new URL(legacy.headers().location).search).toBe("/careers?page=2");
    await publicPage.goto("/careers");
    await expect(publicPage.getByRole("heading", { name: username, exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: `Edit ${username}`, exact: true }).click();
    await page.getByLabel("Publish on careers page", { exact: true }).check();
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByText("Job opening saved.", { exact: true })).toBeVisible();
    await publicPage.reload();
    await expect(publicPage.getByRole("heading", { name: username, exact: true })).toBeVisible();
    await expect(publicPage.getByRole("link", { name: "Apply by email", exact: false }).first()).toHaveAttribute("href", /mailto:/);
    for (const width of [390, 768, 1024, 1440]) {
      await publicPage.setViewportSize({ width, height: 900 });
      expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole("button", { name: `Edit ${username}`, exact: true }).click();
    await page.getByLabel("Job title", { exact: true }).fill(`${username}-updated`);
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByText("Job opening saved.", { exact: true })).toBeVisible();
    await publicPage.reload();
    await expect(publicPage.getByRole("heading", { name: `${username}-updated`, exact: true })).toBeVisible();
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: `Delete ${username}-updated`, exact: true }).click();
    await expect(page.getByText("Job opening deleted.", { exact: true })).toBeVisible();
    await publicPage.reload();
    await expect(publicPage.getByRole("heading", { name: `${username}-updated`, exact: true })).toHaveCount(0);
    await publicPage.close();
    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    expect((await page.request.get("/management/api/overview/")).status()).toBe(403);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/hr\/login$/);
    await expect(page.getByRole("heading", { name: "HR sign in", exact: true })).toBeVisible();
    await page.screenshot({ path: "../.run/hr-login-desktop.png" });
  } finally {
    run("import os; from apps.branches.models import Branch; Branch.objects.filter(code=os.environ['SKY_HR_TEST_USERNAME']).delete(); from apps.careers.models import JobOpening; JobOpening.objects.filter(created_by__username=os.environ['SKY_HR_TEST_USERNAME']).delete(); from apps.notifications.models import Broadcast; Broadcast.objects.filter(sender__username=os.environ['SKY_HR_TEST_USERNAME']).delete(); from django.contrib.auth.models import User; User.objects.filter(username=os.environ['SKY_HR_TEST_USERNAME']).delete()");
    if (setup.includes("HR_GROUP_CREATED:True")) run("from django.contrib.auth.models import Group; group=Group.objects.filter(name='HR').first(); group.delete() if group and not group.user_set.exists() else None");
  }
});
