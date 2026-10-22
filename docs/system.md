# Aeosys — Current system

> Implementation snapshot of the current working tree, not a roadmap or proof of a live deployment. See [README.md](../README.md) for setup and [tech.md](./tech.md) for technical details.

## 1. What exists

Aeosys is an **SEO and answer-readiness review app**. A visitor submits one public page URL, waits for its background audit, reviews source-linked findings, and can copy suggested edits. Findings with a suggested fix also offer a prepared question to an AI advisor.

The implemented journey is:

```text
Page URL → findings + performance data
                           → finding details → copy suggested fix
                                             → optional advisor explanation
```

There is no approve/reject or post-fix verification workflow. The app does not change the target website.

## 2. User experience

The application has one main page at `/`:

1. **Submit:** enter an HTTP(S) page URL and select “Review page.”
2. **Wait:** the client polls while the audit is `queued` or `running`. The UI shows a generic reviewing indicator, not individual tool calls or checkpoint progress.
3. **Review:** see finding count, high-priority count, suggested-change count, a severity chart, performance metrics, and a severity-sorted findings list. Selecting a severity narrows the list.
4. **Inspect:** open a finding in a side drawer to read its recommendation, observed evidence, source URL, and suggested edit if one exists. A supplied `before` value appears as “On your page”; `after` appears as “Suggested version.”
5. **Copy:** copy the proposed `after` text directly. There is no approval prerequisite or downloadable report/export workflow.
6. **Ask advisor:** explicitly send the prepared question, `How should I fix “<finding title>” on this page?` The reply streams into the drawer as Markdown. Opening the drawer only loads existing messages; it does not generate a reply.

The advisor UI is not an editable or multi-turn chat composer. Once a conversation exists, the UI hides the send form. The API does not enforce a one-request lifetime limit; direct callers can repeat the fixed question when the conversation is idle.

The selected audit ID lives in React state. Reports persist server-side, but there is no report-history screen, report permalink route, or browser reload restoration of the selected audit.

**UI sources:** [command center](../src/components/audit-command-center.tsx), [finding details/advisor](../src/components/audit-command-center/finding-details.tsx), [metrics](../src/components/audit-command-center/audit-metrics.tsx), [findings](../src/components/audit-command-center/findings.tsx).

## 3. What an audit reviews

### Scope: submitted page only

The server fetches the submitted page and follows a bounded number of public redirects. The AI receives its final URL, HTTP status, and bounded static HTML. It does not discover or fetch other pages. The report parser normalizes coverage to the submitted page and rejects findings sourced from any other page.

`completed` means a valid AI report was produced for the submitted page. `partial` means the AI review failed or was incomplete and deterministic checks were used instead. This is a page audit, not a site-wide audit.

### AI-assisted path

With `GEMINI_API_KEY`, a Pi Durable conversation uses Gemini and the installed `seo-audit`, `ai-seo`, and `core-web-vitals` skills to review the supplied page HTML. It has no browser-crawl tool. Findings are model-generated, validated against a schema, and checked to ensure evidence points to the submitted page.

Schema validation does **not** independently prove that a recommendation or proposed edit is factually correct. There is no separate per-finding provenance field that labels deterministic versus AI-generated findings; the audit summary and fallback limitations distinguish these paths at report level.

### Deterministic fallback

Without a Gemini key, or if the agent fails, the app returns a `partial` audit using static HTML checks:

| Check | Current behavior |
| --- | --- |
| HTTP status | Reports responses outside 2xx/3xx; 429/5xx are fetch failures before this stage. |
| Title | Reports missing titles and titles longer than 60 characters. |
| Meta description | Reports a missing/empty description. |
| Canonical | Reports a missing/empty canonical href. |
| Main heading | Reports an H1 count other than one. |
| JSON-LD | Reports malformed JSON in matching inline JSON-LD scripts. |

These checks use regular expressions, not a full HTML parser or rendered DOM. They do not check robots directives, canonical correctness, description length, schema.org validity, or missing rendered structured data. Some fallback metadata proposals are placeholders or mechanical truncations; they are drafts for human editing, not ready-to-publish guarantees.

Successful AI output replaces the fallback path; the app does not merge deterministic findings into every AI report.

**Sources:** [audit orchestration](../src/lib/server/audits/service.ts), [fallback analyzer](../src/lib/server/audits/analyzer.ts), [agent report validation](../src/lib/server/agents/audit/agent.ts).

## 4. Performance data

Every nonfailed audit attempts a separate performance measurement before its final result is saved:

- **First choice:** Chrome UX Report (CrUX), when `CRUX_API_KEY` is configured. Queries page-level phone data and reads the 75th percentile of LCP, INP, and CLS.
- **Fallback:** `agent-browser vitals` lab measurements, showing LCP, FCP, and CLS. Lab output is not treated as real-user INP.
- **Unavailable:** if neither source produces usable metrics, the report records an unavailable reason without deliberately failing the SEO review.

The UI distinguishes real-user data from lab measurements. There is no overall SEO/AEO score, PageSpeed Insights API integration, or Lighthouse score in the current measurement path. The lab record/UI says “mobile,” but the command does not explicitly configure mobile emulation; do not treat that label as verified test conditions.

**Sources:** [measurement](../src/lib/server/audits/core-web-vitals.ts), [measurement orchestration](../src/lib/server/audits/service.ts), [performance UI](../src/components/audit-command-center/audit-metrics.tsx).

## 5. Results and terminology

| Term | Meaning in the implementation |
| --- | --- |
| Audit | One submitted page, identified by a UUID. |
| Finding | Title, severity, category, recommendation, and evidence with a source URL and check ID. |
| Proposal / suggested fix | Optional metadata, JSON-LD, or content-snippet draft attached to a finding. It remains unpublished. |
| Coverage | Inspected URLs, remaining URLs, a completeness flag, and limitations. Legacy discovery-oriented field names remain even though audits are page-scoped. |
| Advisor thread | A persisted model conversation for one audit/finding pair, available only when that finding has a proposal. |
| Performance | Optional field or lab measurements attached to the audit, separate from findings. |

Audit states:

| State | Meaning |
| --- | --- |
| `queued` | Audit record and background task created. |
| `running` | Task started; fetch, AI review, or final performance measurement may be in progress. |
| `completed` | Valid AI report produced for the submitted page. |
| `partial` | Static fallback because AI review failed or did not complete. May include an agent error alongside findings. |
| `failed` | Fetch/task failed; no usable report was produced. |

All newly created audits use `mode: "live"`, including static fallback results. The schema and UI support `demo`, but there is no implemented sample-report loader or demo-mode creation path.

## 6. Authority and safety boundaries

- The application has **no authentication, user accounts, tenant isolation, shared rate limiter, daily quota, or spend cap**. Knowing an audit ID is enough to request its report or finding advisor.
- Audits share one durable root store rather than separate user workspaces.
- Initial HTML fetching blocks private-network targets, pins an allowed DNS result for the request, and rechecks redirects. Redirects may reach another public hostname; they are not constrained to the original origin.
- The fallback lab-browser runs in a clean sandbox without application files or secrets. Its network policy permits GET/HEAD to the audited hostname, denies configured private/reserved IPv4 ranges, and disables IPv6 before executing commands. Third-party resources are blocked, which can affect performance measurements.
- Target content and model output are treated as untrusted. Draft markup is displayed as text rather than executed.
- The advisor has no website tools and cannot test, edit, or publish a fix. Its streamed explanation does not update the stored proposal.
- Per-agent budgets constrain one review; they do not prevent unlimited callers from starting new reviews or repeated advisor generations.
- The local performance-browser path is not wrapped in the audit sandbox's firewall. See [technical caveats](./tech.md#8-current-limitations-and-operational-caveats).

Live arbitrary-URL auditing should not be described as access-controlled or ready for unrestricted public use.

## 7. Capability status

| Capability | Current implementation |
| --- | --- |
| Audit scope | Single submitted-page review; no robots/sitemap/link discovery. |
| Application API | Next.js Route Handlers with Pi Durable; no Hono service. |
| Agent integration | Pi Durable, Gemini provider, and SEO skill tools; sandbox browser is used only for lab performance fallback. |
| Persistence | SQLite locally; Vercel Workflow World integration when `VERCEL` is set. |
| Evidence-backed findings | Implemented typed findings, source URLs, coverage checks, and limitations; evidence correctness is not independently verified for AI findings. |
| Before/after preview | Text display when a proposal provides `before`; no rendered website preview. |
| Approve/reject proposals | Not implemented. Status enum values exist but no actions or state-transition handlers. |
| Verify a reviewed fix | Not implemented. Verification schema/store field exists but no verification route, validator workflow, or UI. |
| Copy/export | Clipboard copy without approval; no file export. |
| Authentication and accounts | Not implemented. |
| Account/global cost controls | Not implemented; only per-agent/model limits exist. |
| Precomputed public sample report | No loader or creation path. Demo schema/UI support alone is not a sample report. |
| Finding-scoped advisor and performance metrics | Implemented; explanations and measurements do not modify the target website. |
| Rankings, citations, publishing | Not implemented; readiness checks do not measure these outcomes. |

## 8. Verification boundary

This description comes from source inspection and local checks, not a production deployment test. TypeScript checking and eight targeted unit tests pass. The local browser confirmed the UI describes a single submitted page; detailed checks and remaining verification limits are in [tech.md](./tech.md#7-checks-and-test-status).

Use [README.md](../README.md) for setup, this document for system behavior, and [tech.md](./tech.md) for implementation details and operational caveats.
