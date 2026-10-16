import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("separate HR login authenticates only an HR account and protects the workspace", async ({ page, baseURL }) => {
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
        const sidebar = await page.locator("aside").boundingBox();
        expect(sidebar!.width / width).toBeCloseTo(0.2, 2);
      }
    }
    await expect(page.getByText(`Signed in as ${username}.`, { exact: true })).toBeVisible();
    const search = page.getByRole("searchbox", { name: "Search HR", exact: true });
    await search.fill("STAFF");
    await expect(page.getByRole("navigation", { name: "HR search results" }).getByRole("link", { name: "Employees", exact: true })).toBeVisible();
    await page.getByLabel("Filter HR search", { exact: true }).selectOption("/hr/hiring");
    await expect(page.getByText("No matching sections. Try staff, interview or alerts.")).toBeVisible();
    await search.fill("INTERVIEW");
    await expect(page.getByRole("navigation", { name: "HR search results" }).getByRole("link", { name: "Hiring Process", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear search and filters", exact: true }).click();
    await expect(page.getByLabel("Current India time", { exact: true })).not.toHaveText("Loading time?");
    const clock = await page.getByLabel("Current India time", { exact: true }).getAttribute("datetime");
    await expect(page.getByLabel("Current India time", { exact: true })).not.toHaveAttribute("datetime", clock!);
    expect(await page.locator("header").evaluate(element => getComputedStyle(element.parentElement!).position)).toBe("sticky");
    await page.getByRole("link", { name: "Employees", exact: true }).click();
    await expect(page).toHaveURL(/\/hr\/employees$/);
    await expect(page.getByRole("heading", { name: "Employees", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Employees", exact: true })).toHaveAttribute("aria-current", "page");
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
    await page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: "Manage Branch", exact: true }).click();
    await expect(page).toHaveURL(/\/hr\/branches$/);
    await expect(page.getByRole("heading", { name: "Manage Branch", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: "Manage Branch", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: "Leave Requests", exact: true }).click();
    await expect(page).toHaveURL(/\/hr\/leave-requests$/);
    await expect(page.getByRole("heading", { name: "Leave Requests", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "HR navigation" }).getByRole("link", { name: "Leave Requests", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("Leave requests are not connected yet.", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    expect((await page.request.get("/management/api/overview/")).status()).toBe(403);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/hr\/login$/);
    await expect(page.getByRole("heading", { name: "HR sign in", exact: true })).toBeVisible();
    await page.screenshot({ path: "../.run/hr-login-desktop.png" });
  } finally {
    run("import os; from apps.notifications.models import Broadcast; Broadcast.objects.filter(sender__username=os.environ['SKY_HR_TEST_USERNAME']).delete(); from django.contrib.auth.models import User; User.objects.filter(username=os.environ['SKY_HR_TEST_USERNAME']).delete()");
    if (setup.includes("HR_GROUP_CREATED:True")) run("from django.contrib.auth.models import Group; group=Group.objects.filter(name='HR').first(); group.delete() if group and not group.user_set.exists() else None");
  }
});
