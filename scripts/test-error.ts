import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ErrorPage from "../src/app/error"

test("error page offers recovery without exposing error details", () => {
  const error = Object.assign(new Error("private database connection details"), {
    digest: "audit-123",
  })
  const markup = renderToStaticMarkup(createElement(ErrorPage, { error, retry: () => {} }))
  assert.match(markup, /role="alert"/)
  assert.match(markup, /<h1[^>]*id="error-heading"/)
  assert.match(markup, /Try again/)
  assert.match(markup, /<a[^>]*href="\/"[^>]*role="link"[^>]*>Back to start<\/a>/)
  assert.match(markup, /href="mailto:shanvit7@gmail.com"/)
  assert.match(markup, /Error reference: audit-123/)
  assert.doesNotMatch(markup, /private database connection details/)

  for (const thrown of [null, "private thrown string", { digest: "not-an-error" }]) {
    const fallback = renderToStaticMarkup(
      createElement(ErrorPage, { error: thrown, retry: () => {} }),
    )
    assert.match(fallback, /Try again/)
    assert.doesNotMatch(fallback, /private thrown string|not-an-error|Error reference:/)
  }
})
