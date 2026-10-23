import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import WorkspaceLoading from "../src/app/(authenticated)/loading"
import PublicLoading from "../src/app/loading"

const publicMarkup = renderToStaticMarkup(createElement(PublicLoading))
assert.match(publicMarkup, /role="status"/)
assert.equal(publicMarkup.match(/Aeosys/g)?.length, 1)
assert.match(publicMarkup, /motion-reduce:animate-none/)
assert.doesNotMatch(publicMarkup, /<svg|<img/)
assert.doesNotMatch(publicMarkup, /Opening your workspace/)
assert.match(renderToStaticMarkup(createElement(WorkspaceLoading)), /Opening your workspace/)

test("unauthenticated requests show public loading, then redirect to login", async () => {
  const response = await fetch(`${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/`, {
    signal: AbortSignal.timeout(15_000),
  })
  assert.equal(response.status, 200)
  assert.ok(response.body)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let shell = ""
  try {
    while (!shell.includes("</main>")) {
      const { done, value } = await reader.read()
      assert.ok(!done, "Expected a loading shell before the unauthenticated redirect.")
      shell += decoder.decode(value, { stream: true })
    }
    const visibleShell = shell.slice(0, shell.indexOf("</main>"))
    assert.match(visibleShell, /Loading…/)
    assert.doesNotMatch(visibleShell, /Opening your workspace/)

    // Let auth finish: cancelling at the shell would miss redirect/render failures.
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      shell += decoder.decode(value, { stream: true })
    }
    shell += decoder.decode()
    assert.match(shell, /http-equiv="refresh" content="\d+;url=\/login"/)
    assert.doesNotMatch(shell, /Could not validate `instant`/)
    assert.doesNotMatch(shell, /An error occurred while attempting to validate instant UI/)
  } finally {
    await reader.cancel()
  }
})

test("streamed public loading fills the viewport with one background", async () => {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
  const response = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(15_000) })
  const html = await response.text()
  const mainEnd = html.indexOf("</main>")
  assert.ok(mainEnd >= 0, "Expected the real server-rendered loading shell.")
  const loadingHtml = html.slice(0, mainEnd + 7)
  const session = execFileSync(
    "agent-browser",
    ["session", "id", "--scope", "worktree", "--prefix", "route-loading"],
    { encoding: "utf8" },
  ).trim()
  const browser = (...args: string[]) =>
    execFileSync("agent-browser", args, {
      encoding: "utf8",
      env: { ...process.env, AGENT_BROWSER_SESSION: session, AGENT_BROWSER_RESTORE: session },
    }).trim()

  try {
    browser("open", `${baseUrl}/login`)
    browser("wait", "#email")
    browser("set", "media", "dark", "reduced-motion")
    browser(
      "eval",
      `(() => {
        const parsed = new DOMParser().parseFromString(${JSON.stringify(loadingHtml)}, 'text/html')
        const main = parsed.querySelector('main[aria-busy="true"]')
        if (!main) throw new Error('Expected the server-rendered loading shell.')
        const host = document.createElement('div')
        host.style.cssText = 'width: 16rem; margin: 2rem auto; padding: 1rem'
        document.body.append(host)
        host.append(main)
      })()`,
    )
    for (const [width, height] of [
      [375, 812],
      [1440, 1000],
      [1470, 756],
      [812, 375],
    ]) {
      browser("set", "viewport", String(width), String(height))
      assert.equal(
        browser(
          "eval",
          `(() => {
          const main = document.querySelector('main')
          const rect = main.getBoundingClientRect()
          return rect.x === 0 && rect.y === 0 && rect.width === innerWidth &&
            rect.height === innerHeight && document.documentElement.scrollWidth <= innerWidth &&
            getComputedStyle(main).backgroundColor === 'rgba(0, 0, 0, 0)' &&
            getComputedStyle(document.documentElement).backgroundColor ===
              getComputedStyle(document.body).backgroundColor
        })()`,
        ),
        "true",
        `Loading must fill ${width}×${height} without a separate background panel`,
      )
    }
  } finally {
    browser("close")
  }
})
