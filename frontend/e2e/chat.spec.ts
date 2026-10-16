import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce", trace: "off", screenshot: "off", video: "off", launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } });

test("HR and employee exchange messages, files and an accepted video call", async ({ browser, baseURL }) => {
  test.skip(!process.env.SKY_CHAT_TESTS, "Requires explicitly enabled isolated local accounts");
  test.setTimeout(120000);
  const backend = path.resolve("../backend");
  const suffix = Date.now().toString();
  const env = { ...process.env, CHAT_QA_PREFIX: `qa-chat-${suffix}`, CHAT_QA_PASSWORD: randomBytes(24).toString("hex") };
  const run = (script: string) => execFileSync(path.join(backend, ".venv/Scripts/python.exe"), ["manage.py", "shell", "-c", script], { cwd: backend, env, stdio: "pipe" });
  run("import os; from django.contrib.auth.models import User,Group; prefix=os.environ['CHAT_QA_PREFIX']; password=os.environ['CHAT_QA_PASSWORD']; h=User.objects.create_user(prefix+'-hr',password=password); e=User.objects.create_user(prefix+'-employee',password=password); h.groups.add(Group.objects.get_or_create(name='HR')[0]); e.groups.add(Group.objects.get_or_create(name='Employees')[0])");
  const hrContext = await browser.newContext({ baseURL, permissions: ["camera", "microphone"], reducedMotion: "reduce" });
  const employeeContext = await browser.newContext({ baseURL, permissions: ["camera", "microphone"], reducedMotion: "reduce" });
  try {
    const h = await hrContext.newPage(); const e = await employeeContext.newPage();
    await Promise.all([h.waitForResponse(r => r.url().includes("/hr/api/session/") && r.request().method() === "GET"), h.goto("/hr/login?next=%2Fhr%2Fchat")]);
    await h.getByLabel("Username", { exact: true }).fill(`${env.CHAT_QA_PREFIX}-hr`);
    await h.getByLabel("Password", { exact: true }).fill(env.CHAT_QA_PASSWORD);
    await h.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(h).toHaveURL(/\/hr\/chat$/);
    await Promise.all([e.waitForResponse(r => r.url().includes("/chat/api/session/") && r.request().method() === "GET"), e.goto("/employee/login")]);
    await e.getByLabel("Username", { exact: true }).fill(`${env.CHAT_QA_PREFIX}-employee`);
    await e.getByLabel("Password", { exact: true }).fill(env.CHAT_QA_PASSWORD);
    await e.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(e).toHaveURL(/\/employee\/chat$/);
    await h.getByRole("button", { name: new RegExp(`${env.CHAT_QA_PREFIX}-employee`) }).click();
    await e.getByRole("button", { name: new RegExp(`${env.CHAT_QA_PREFIX}-hr`) }).click();
    await h.getByLabel("Message", { exact: true }).fill("Private HR message test");
    await h.getByLabel("Message", { exact: true }).press("Enter");
    await expect(e.getByRole("log")).toContainText("Private HR message test", { timeout: 15000 });
    await e.getByLabel("Message", { exact: true }).fill("Employee file reply");
    await e.getByLabel("Attach a file", { exact: false }).setInputFiles({ name: "private-chat.txt", mimeType: "text/plain", buffer: Buffer.from("Isolated chat test file") });
    await e.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(h.getByRole("log")).toContainText("Employee file reply", { timeout: 15000 });
    const download = h.waitForEvent("download");
    await h.getByRole("link", { name: /private-chat.txt/ }).click();
    expect((await download).suggestedFilename()).toBe("private-chat.txt");
    for (const width of [390, 768, 1024, 1440]) {
      await h.setViewportSize({ width, height: 900 });
      expect(await h.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390) {
        await h.getByRole("button", { name: "Back to conversations", exact: true }).click();
        await expect(h.getByRole("heading", { name: "Chats", exact: true })).toBeVisible();
        await h.getByRole("button", { name: new RegExp(`${env.CHAT_QA_PREFIX}-employee`) }).click();
        await expect(h.getByLabel("Message", { exact: true })).toBeVisible();
        if (process.env.SKY_CHAT_PREVIEW) await h.getByRole("region", { name: "Employee and HR chat", exact: true }).screenshot({ path: "../.run/chat-mobile.png" });
      }
    }
    if (process.env.SKY_CHAT_PREVIEW) await h.getByRole("region", { name: "Employee and HR chat", exact: true }).screenshot({ path: "../.run/chat-desktop.png" });
    await h.getByRole("button", { name: "Request video call", exact: true }).click();
    await expect(e.getByRole("button", { name: "Accept call", exact: true })).toBeVisible({ timeout: 15000 });
    await e.getByRole("button", { name: "Accept call", exact: true }).click();
    for (const page of [h, e]) {
      await expect(page.getByRole("region", { name: "Active call" }).getByRole("status")).toHaveText("connected", { timeout: 25000 });
      await expect.poll(() => page.getByLabel("Remote participant").evaluate((element: HTMLVideoElement) => (element.srcObject as MediaStream | null)?.getVideoTracks().length || 0)).toBeGreaterThan(0);
    }
    await h.getByRole("button", { name: "End call", exact: true }).click();
    await expect(e.getByRole("region", { name: "Active call" })).toHaveCount(0, { timeout: 10000 });
    await e.getByRole("button", { name: "Voice call", exact: true }).click();
    await expect(h.getByRole("button", { name: "Accept call", exact: true })).toBeVisible({ timeout: 15000 });
    await h.getByRole("button", { name: "Accept call", exact: true }).click();
    for (const page of [h, e]) {
      await expect(page.getByRole("region", { name: "Active call" }).getByRole("status")).toHaveText("connected", { timeout: 25000 });
      expect(await page.getByLabel("Your camera").evaluate((element: HTMLVideoElement) => (element.srcObject as MediaStream).getVideoTracks().length)).toBe(0);
    }
    await e.getByRole("button", { name: "Mute microphone", exact: true }).click();
    await expect(e.getByRole("button", { name: "Unmute", exact: true })).toBeVisible();
    await e.getByRole("button", { name: "End call", exact: true }).click();
    await expect(h.getByRole("region", { name: "Active call" })).toHaveCount(0, { timeout: 10000 });
    await h.getByRole("button", { name: "Request video call", exact: true }).click();
    await e.getByRole("button", { name: "Decline", exact: true }).click();
    await expect(h.getByRole("region", { name: "Active call" })).toHaveCount(0, { timeout: 10000 });
  } finally {
    await hrContext.close(); await employeeContext.close();
    run("import os; from django.contrib.auth.models import User; from apps.chat.models import Conversation,Message; from django.db.models import Q; users=User.objects.filter(username__startswith=os.environ['CHAT_QA_PREFIX']); threads=Conversation.objects.filter(Q(first__in=users)|Q(second__in=users)); files=list(Message.objects.filter(conversation__in=threads).exclude(attachment='').values_list('attachment',flat=True)); storage=Message._meta.get_field('attachment').storage; [storage.delete(f) for f in files]; threads.delete(); users.delete()");
  }
});
