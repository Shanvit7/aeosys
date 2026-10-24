import assert from "node:assert/strict"
import test from "node:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderToStaticMarkup } from "react-dom/server"
import { AdvisorChat } from "@/components/audit-command-center/finding-details"
import { type AdvisorMessage, type AuditFinding, advisorPromptFor } from "@/schemas/audit.schema"
import { TAGS } from "@/services/tags"

const finding: AuditFinding = {
  id: "headings",
  title: "Missing section headings",
  severity: "medium",
  category: "content-structure",
  recommendation: "Add descriptive H2 headings.",
  evidence: {
    description: "Sections use divs.",
    sourceUrl: "https://example.com",
    checkId: "headings",
  },
}

const renderChat = (messages: AdvisorMessage[] = []) => {
  const client = new QueryClient()
  client.setQueryData(TAGS.audits.advisor("audit", finding.id), {
    messages,
    promptUsed: messages.length > 0,
  })
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AdvisorChat auditId="audit" finding={finding} />
    </QueryClientProvider>,
  )
  client.clear()
  return html
}

test("note starts with compact action question and no answer or instructional chrome", () => {
  const html = renderChat()
  assert.match(html, /Does “Missing section headings” need action, and what should I do\?/)
  assert.match(html, /data-slot="input-group"/)
  assert.match(html, /type="submit"[^>]*aria-label="Send question"/)
  assert.doesNotMatch(
    html,
    /<textarea|<input|contenteditable|Read only|Fix advisor|Understand this change|Add descriptive H2/,
  )
  assert.doesNotMatch(
    html,
    /data-slot="card"|data-slot="message-scroller"|Reviewing the suggested fix/,
  )
})

test("sent conversation uses shadcn messages and Markdown without another composer", () => {
  const html = renderChat([
    { role: "user", content: advisorPromptFor(finding) },
    { role: "assistant", content: "### Suggested change\n\nAdd **descriptive headings**." },
  ])
  assert.match(html, /data-slot="message-scroller"/)
  assert.equal((html.match(/data-slot="message"/g) ?? []).length, 2)
  assert.match(html, /data-slot="bubble"/)
  assert.match(html, /<h3>Suggested change<\/h3>/)
  assert.match(html, /<strong>descriptive headings<\/strong>/)
  assert.doesNotMatch(html, /<form|Read only/)
})
