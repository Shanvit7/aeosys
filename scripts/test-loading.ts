import assert from "node:assert/strict"
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
