import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local", quiet: true })

const url = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
const session = execFileSync(
  "agent-browser",
  ["session", "id", "--scope", "worktree", "--prefix", "login-smoke"],
  { encoding: "utf8" },
).trim()
const browser = (...args: string[]) =>
  execFileSync("agent-browser", args, {
    encoding: "utf8",
    env: { ...process.env, AGENT_BROWSER_SESSION: session },
  }).trim()
const check = (expression: string) => assert.equal(browser("eval", expression), "true")

try {
  browser("open", `${url}/`)
  browser("set", "viewport", "1440", "1000")
  browser("wait", "#email")
  check('window.location.pathname === "/login"')
  check('document.querySelector("#password").type === "password"')
  browser("find", "role", "button", "click", "--name", "Show password")
  check('document.querySelector("#password").type === "text"')
  browser("find", "role", "button", "click", "--name", "Hide password")
  check('document.querySelector("#password").type === "password"')
  check('!document.querySelector("a[href*=signup], a[href*=sign-up]")')

  for (const width of [375, 768, 1024, 1440]) {
    browser("set", "viewport", String(width), "900")
    check("document.documentElement.scrollWidth <= window.innerWidth")
  }

  browser("set", "media", "dark", "reduced-motion")
  browser("reload")
  browser("wait", "#email")
  browser("wait", "button[aria-label='Play video']")
  check(`!document.querySelector('button[aria-label="Pause video"]')`)

  browser("fill", "#email", "invalid@example.com")
  browser("fill", "#password", "incorrect-password")
  browser("find", "role", "button", "click", "--name", "Sign in", "--exact")
  browser("wait", "[role=alert]")
  check('document.querySelector("[role=alert]").textContent.includes("Unable to sign in")')
  check('document.querySelector("#email").value === "invalid@example.com"')

  const email = process.env.DEMO_EMAIL
  const password = process.env.DEMO_PASSWORD
  assert.ok(email && password, "Set DEMO_EMAIL and DEMO_PASSWORD to test seeded login.")
  browser("fill", "#email", email)
  browser("fill", "#password", password)
  browser("find", "role", "button", "click", "--name", "Sign in", "--exact")
  browser("wait", "#audit-url")
  check('window.location.pathname === "/"')
  browser("find", "role", "button", "click", "--name", "Account menu", "--exact")
  browser("wait", "[role=menuitem]")
  browser("find", "role", "menuitem", "click", "--name", "Sign out", "--exact")
  browser("wait", '[data-slot="alert-dialog-content"]')
  browser("find", "role", "button", "click", "--name", "Sign out", "--exact")
  browser("wait", "#email")
  check('window.location.pathname === "/login"')
  console.log(
    "Login passed: responsive layout, password toggle, reduced motion, errors, demo sign-in.",
  )
} catch (error) {
  console.error(browser("get", "url"))
  console.error(browser("snapshot", "-i"))
  throw error
} finally {
  browser("close")
}
