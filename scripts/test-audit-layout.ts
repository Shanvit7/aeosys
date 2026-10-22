import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import dotenv from "dotenv"
import { logger } from "@/lib/server/logger"

dotenv.config({ path: ".env.local", quiet: true })

// Run with next dev: pnpm exec tsx scripts/test-audit-layout.ts
// Mock audit requests: no live audit, external fetch, or AI spend.
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000"
const session = execFileSync(
  "agent-browser",
  ["session", "id", "--scope", "worktree", "--prefix", "audit-layout"],
  { encoding: "utf8" },
).trim()
const browser = (...args: string[]) =>
  execFileSync("agent-browser", args, {
    encoding: "utf8",
    env: { ...process.env, AGENT_BROWSER_SESSION: session, AGENT_BROWSER_RESTORE: session },
  }).trim()
const check = (expression: string) => assert.equal(browser("eval", expression), "true", expression)
const checkBackdrop = () =>
  check(`(() => {
    const page = document.querySelector('main').parentElement
    const bounds = page.getBoundingClientRect()
    const layers = [...page.children].filter(el => el.getAttribute('aria-hidden') === 'true')
    return layers.length === 2 && layers.every(el => {
      const rect = el.getBoundingClientRect()
      return rect.left === 0 && rect.width === document.documentElement.clientWidth &&
        rect.top === bounds.top && rect.height === bounds.height && rect.height >= innerHeight
    })
  })()`)
const audit = {
  auditId: "12345678-1234-4234-8234-123456789abc",
  url: `https://example.com/${"long-path".repeat(30)}`,
  status: "running",
  mode: "demo",
  createdAt: "2026-07-01T00:00:00.000Z",
  findings: [],
}
const mockDetail = (status: string) => {
  browser("network", "unroute", `**/api/audits/${audit.auditId}`)
  browser(
    "network",
    "route",
    `**/api/audits/${audit.auditId}`,
    "--body",
    JSON.stringify({ ...audit, status }),
  )
}
const resolveCreate = (status = 200) =>
  browser(
    "eval",
    `window.finishAudit(new Response(${JSON.stringify(JSON.stringify({ ...audit, status: "queued" }))}, { status: ${status} }))`,
  )

try {
  browser("open", "--enable", "react-devtools", `${baseUrl}/`)
  browser("wait", "input")
  if (browser("get", "url").includes("/login")) {
    const { DEMO_EMAIL: email, DEMO_PASSWORD: password } = process.env
    assert.ok(email && password, "Set DEMO_EMAIL and DEMO_PASSWORD to test seeded login.")
    browser("fill", "#email", email)
    browser("fill", "#password", password)
    browser("find", "role", "button", "click", "--name", "Sign in", "--exact")
  }
  browser("wait", "#audit-url")
  browser("set", "media", "dark", "reduced-motion")

  for (const [width, height] of [
    [320, 740],
    [375, 812],
    [768, 1024],
    [1024, 768],
    [1440, 1200],
    [812, 375],
  ]) {
    browser("set", "viewport", String(width), String(height))
    browser("reload")
    browser("wait", '[aria-label="How Aeosys reviews a website"]')
    const initialHeight = Number(browser("eval", 'document.querySelector("main").offsetHeight'))
    checkBackdrop()
    mockDetail("running")
    // Install in page world so React's fetch sees the held POST, not the eval sandbox.
    browser(
      "eval",
      `(() => {
      const script = document.createElement("script")
      script.textContent = ${JSON.stringify(`const originalFetch = window.fetch
        window.fetch = (input, init) => String(input).endsWith("/api/audits") && init?.method === "POST"
          ? new Promise(resolve => { window.finishAudit = resolve })
          : originalFetch(input, init)`)}
      document.head.append(script)
    })()`,
    )
    browser("fill", "#audit-url", audit.url)
    browser("find", "role", "button", "click", "--name", "Review website", "--exact")
    browser("wait", "[aria-busy=true]")
    check('typeof window.finishAudit === "function"')
    checkBackdrop()
    check(`Math.abs(document.querySelector("main").offsetHeight - ${initialHeight}) <= 2`)
    check("document.documentElement.scrollWidth <= innerWidth")
    check('document.querySelector("button[type=submit]").disabled')
    resolveCreate()
    browser(
      "wait",
      "--fn",
      'document.querySelector("button[type=submit] svg.animate-spin") === null',
    )
    check(`Math.abs(document.querySelector("main").offsetHeight - ${initialHeight}) <= 2`)
    check('document.querySelector("[aria-busy=true]").textContent.includes("AI is reviewing")')
    checkBackdrop()
    mockDetail("completed")
    browser("wait", "#audit-findings")
    check('!document.querySelector("[aria-busy=true]")')
    check("document.documentElement.scrollWidth <= innerWidth")
    check('!document.querySelector("button[type=submit]").disabled')

    // A retry must replace stale results, keep status visible, and recover on failure.
    browser("find", "role", "button", "click", "--name", "Review website", "--exact")
    browser("wait", "[aria-busy=true]")
    check('!document.querySelector("#audit-findings")')
    resolveCreate(500)
    browser("wait", "[role=alert]")
    browser("wait", "#audit-findings")
    check('!document.querySelector("button[type=submit]").disabled')
    logger.info("Audit layout passed", { width, height })
  }
} catch (error) {
  logger.error("Audit layout failed", {
    snapshot: browser("snapshot"),
    requests: browser("network", "requests", "--filter", "api/audits"),
  })
  throw error
} finally {
  browser("network", "unroute")
  browser("close")
}
