#!/usr/bin/env node
// Headless browser driver for the mghsingles admin UI.
//
// Reads one command per line on stdin, prints one result line per command.
// Designed to be fed a heredoc so an agent can run a whole flow in one shot:
//
//   node .claude/skills/run-mghsingles-admin/driver.mjs <<'EOF'
//   goto /login
//   ls
//   fill input[name=username] devuser
//   click .boton
//   shot after-login
//   EOF
//
// Uses playwright-core against the system Google Chrome, so nothing downloads
// a browser. Install deps once: (cd .claude/skills/run-mghsingles-admin && npm install)
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.UI_URL || "http://localhost:3000";
const SHOTS = process.env.SHOT_DIR || resolve(HERE, "shots");
const HEADLESS = process.env.HEADFUL !== "1";
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: HEADLESS });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// Buffer console + failed requests so `console` / `net` can dump them later.
// CRA apps swallow a lot of errors into the console; this is usually where the
// real reason a page is blank shows up.
const logs = [];
const failed = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
// Native confirm()/alert() dialogs block the page and Playwright dismisses them
// by default, which silently turns a confirmed delete into a no-op. Accept by
// default and record what was asked; `dialog dismiss` flips it.
let dialogAction = "accept";
const dialogs = [];
page.on("dialog", async (d) => {
  dialogs.push(`[${d.type()}] ${d.message()}`);
  if (dialogAction === "accept") await d.accept();
  else await d.dismiss();
});

page.on("requestfailed", (r) =>
  failed.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`)
);
page.on("response", (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${r.url()}`);
});

const url = (u) => (u.startsWith("http") ? u : BASE + (u.startsWith("/") ? u : "/" + u));

// Selectors routinely contain spaces (input[placeholder="Escribe el nombre"]),
// so a plain split-on-first-space mangles them. Accept an explicitly quoted
// selector; otherwise fall back to the first space.
function splitSelectorAndValue(rest) {
  const q = rest[0];
  if (q === '"' || q === "'") {
    const end = rest.indexOf(q, 1);
    if (end !== -1) return [rest.slice(1, end), rest.slice(end + 1).trim()];
  }
  const i = rest.indexOf(" ");
  if (i === -1) return [rest, ""];
  return [rest.slice(0, i), rest.slice(i + 1)];
}

async function run(line) {
  const sp = line.indexOf(" ");
  const cmd = sp === -1 ? line : line.slice(0, sp);
  const rest = sp === -1 ? "" : line.slice(sp + 1).trim();

  switch (cmd) {
    case "goto":
      await page.goto(url(rest), { waitUntil: "domcontentloaded" });
      // CRA renders client-side; give React a beat to mount.
      await page.waitForTimeout(700);
      return `at ${page.url()}`;

    case "wait":
      await page.waitForSelector(rest, { timeout: 15000 });
      return `visible ${rest}`;

    case "waitms":
      await page.waitForTimeout(Number(rest || 500));
      return `waited ${rest || 500}ms`;

    case "fill": {
      const [sel, val] = splitSelectorAndValue(rest);
      await page.fill(sel, val);
      return `filled ${sel}`;
    }

    case "click":
      await page.click(rest, { timeout: 15000 });
      await page.waitForTimeout(700);
      return `clicked ${rest} -> ${page.url()}`;

    // Click by visible text — this app's buttons have generic class names,
    // so text is usually the only stable handle.
    case "clicktext":
      await page.getByText(rest, { exact: false }).first().click({ timeout: 15000 });
      await page.waitForTimeout(700);
      return `clicked text "${rest}" -> ${page.url()}`;

    case "text": {
      const t = rest
        ? await page.locator(rest).first().innerText()
        : await page.locator("body").innerText();
      return t.replace(/\n{2,}/g, "\n").trim().slice(0, 2000);
    }

    // Dump every interactive element with a usable selector. Start here when
    // you don't know what the page offers.
    case "ls":
      return (
        await page.$$eval(
          "input,button,a,select,textarea,[role=button]",
          (els) =>
            els.slice(0, 60).map((e) => {
              const attrs = [
                e.name && `name=${e.name}`,
                e.type && `type=${e.type}`,
                e.id && `id=${e.id}`,
                e.className && typeof e.className === "string" && `class="${e.className}"`,
                e.placeholder && `ph="${e.placeholder}"`,
              ].filter(Boolean);
              const label = (e.innerText || e.value || "").trim().slice(0, 40);
              return `${e.tagName.toLowerCase()} ${attrs.join(" ")} ${label ? `:: ${label}` : ""}`;
            })
        )
      ).join("\n");

    case "shot": {
      const p = resolve(SHOTS, `${rest || "shot"}.png`);
      await page.screenshot({ path: p, fullPage: true });
      return `wrote ${p}`;
    }

    case "eval":
      return JSON.stringify(await page.evaluate(rest));

    // The UI keeps its auth token in localStorage under REACT_APP_LS_LOGIN_TOKEN.
    // `token <value>` injects one so you can skip the login form entirely.
    case "token":
      await page.evaluate(
        ([k, v]) => localStorage.setItem(k, v),
        [process.env.LS_KEY || "mghsinglesAdminToken", rest]
      );
      return `set localStorage[${process.env.LS_KEY || "mghsinglesAdminToken"}]`;

    case "dialog":
      if (rest !== "accept" && rest !== "dismiss") return "usage: dialog accept|dismiss";
      dialogAction = rest;
      return `dialogs will be ${rest}ed`;

    case "dialogs":
      return dialogs.length ? dialogs.join("\n") : "(no dialogs)";

    case "console":
      return logs.length ? logs.slice(-40).join("\n") : "(no console output)";

    case "net":
      return failed.length ? failed.slice(-40).join("\n") : "(no failed requests)";

    case "quit":
      return null;

    default:
      return `?? unknown command: ${cmd}`;
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
let failures = 0;
for await (const raw of rl) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  try {
    const out = await run(line);
    if (out === null) break;
    console.log(`> ${line}\n${out}\n`);
  } catch (e) {
    failures++;
    console.log(`> ${line}\nFAIL: ${e.message.split("\n")[0]}\n`);
  }
}
await browser.close();
process.exit(failures ? 1 : 0);
