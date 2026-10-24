import assert from "node:assert/strict"
import test from "node:test"
import { advisorChatRequestSchema, advisorPromptFor } from "@/schemas/audit.schema"
import { auditStoreSchema } from "@/schemas/audit-store.schema"

test("advisor accepts only a send action, never caller-written text", () => {
  assert.equal(advisorChatRequestSchema.safeParse({}).success, true)
  for (const payload of [{ message: "custom question" }, { prompt: "override" }, { message: "" }]) {
    assert.equal(advisorChatRequestSchema.safeParse(payload).success, false)
  }
})

test("locked advisor prompt asks about the finding without including its answer", () => {
  const finding = { title: "Missing H2 headings", recommendation: "Add descriptive H2 headings." }
  const prompt = advisorPromptFor(finding)
  assert.equal(prompt, "Does “Missing H2 headings” need action, and what should I do?")
  assert.equal(
    advisorPromptFor({
      title: finding.title,
      proposedFix: {
        id: "fix",
        kind: "metadata",
        rationale: "Improve metadata",
        after: "<title>Page</title>",
        status: "proposed",
        publicationStatus: "not-published",
      },
    }),
    "How should I fix “Missing H2 headings” on this page?",
  )
  assert.doesNotMatch(prompt, /Suggested fix:|Add descriptive H2 headings\./)
  const changedRecommendation = { ...finding, recommendation: "A different answer" }
  assert.equal(advisorPromptFor(changedRecommendation), prompt)
  assert.notEqual(advisorPromptFor({ title: "Missing description" }), prompt)
  assert.ok(advisorPromptFor({ title: "x".repeat(10_000) }).length < 400)
})

test("legacy audit stores gain empty advisor state during migration", () => {
  const store = auditStoreSchema.parse({ audits: {}, verifications: {} })
  assert.deepEqual(store.advisorThreads, {})
  assert.deepEqual(store.advisorPromptUsed, {})
})
