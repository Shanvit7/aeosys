# Aeosys — Technical implementation

> Current working-tree implementation, including uncommitted code. Not a deployment certification or a plan. See [README.md](../README.md) for setup and [system.md](./system.md) for product behavior.

## 1. Stack and entry points

| Layer | Implemented choice |
| --- | --- |
| Web application | Next.js `16.4.2` App Router, React/React DOM `19.3.0`, TypeScript. |
| UI | Tailwind CSS 4, shadcn/Base UI components, Lucide icons, Motion, Geist fonts; dark root layout. |
| Browser server-state | TanStack Query `5.104.0`. |
| Runtime validation | Zod `4.6.7`; shared schemas for server and client results. |
| Background execution | `@earendil-works/pi-durable`, `pi-ai`, and `chord`, all pinned to `1.3.0`. |
| Deployment adapter | `durable-harness` `0.0.1-beta.6`, with local/Vercel Workflow World packages. |
| Model | Google provider; `AEOSYS_GEMINI_MODEL` or `gemini-flash-lite-latest`. |
| Rendered inspection | `@agent-browser/sandbox` and `@vercel/sandbox`; prebuilt clean Chromium/agent-browser snapshot. |
| Static HTTP | Node HTTP(S), DNS, and BlockList APIs; no crawler or HTML-parser dependency. |
| API reference | Scalar at `/api/docs`, OpenAPI 3.1.1 at `/api/openapi`. |
| Tooling | pnpm, Biome, Oxlint, TypeScript, tsx + Node test runner, React Doctor, Knip, Husky/lint-staged. |

Versions above are package declarations, not a guarantee that every installed tool or hosted runtime has been validated together. There is no Better Auth dependency or separate Hono server.

`next.config.ts` enables Cache Components, partial prefetching, and React Compiler. It wraps Next configuration with `withDurableHarness` and traces the SEO, AI SEO, Core Web Vitals, and browser Markdown skill files into the server output. The durable-harness wrapper supplies queue/recovery integration; there is no hand-written application queue consumer or separate worker service in `src`.

## 2. Code map

| Path | Responsibility |
| --- | --- |
| `src/app/page.tsx`, `src/app/layout.tsx` | Main screen, metadata, fonts, dark layout, query provider. |
| `src/components/audit-command-center.tsx` | URL form, active audit state, running/error/result views. |
| `src/components/audit-command-center/` | Summary, severity filtering, performance metrics, findings drawer, advisor UI. |
| `src/components/providers.tsx` | One QueryClient per mounted provider. |
| `src/hooks/use-audits.ts` | Queries, mutations, streamed advisor text, cache updates. |
| `src/services/audits.service.ts` | API calls, polling options, SSE reader. |
| `src/lib/api-client.ts` | JSON fetch helper and browser-side API errors. |
| `src/app/api/` | HTTP route handlers. |
| `src/lib/server/audits/service.ts` | Harness setup, durable audit task, result storage, proposal reads, advisor conversations. |
| `src/lib/server/audits/fetcher.ts` | Public URL/DNS checks and bounded HTML fetch. |
| `src/lib/server/audits/analyzer.ts` | Static fallback checks and metadata drafts. |
| `src/lib/server/audits/core-web-vitals.ts` | CrUX query, field/lab parsing, metric classifications. |
| `src/lib/server/audit-agent/agent.ts` | Agent submission/wait, timeout, JSON parsing and report scope validation. |
| `src/lib/server/audit-agent/tools.ts` | Skill/HTML/browser tools and conversation documents. |
| `src/lib/server/audit-agent/browser.ts` | Sandbox creation, firewall, shell execution, stop operation. |
| `src/schemas/` | Request, audit, proposal, coverage, advisor, performance, and durable-store contracts. |
| `src/lib/server/openapi.ts` | OpenAPI paths and Zod-derived schemas. |

## 3. Audit execution

```text
Browser form
  → POST /api/audits
  → validate request syntax; commit queued record + durable task
  ← 202 AuditResult

Pi Durable task: start → fetch → optional agent → finish
  fetch → public HTML + final URL
    no Gemini key → deterministic partial report
    Gemini key    → child conversation + HTML snapshot
                    → skills / optional sandbox browser
                    → validate JSON and page scope
                    → completed or partial report
    agent failure → deterministic partial report
    fetch failure → failed report
  finish → CrUX or browser lab measurement for nonfailed reports
         → commit terminal result

Browser → GET /api/audits/{id} every 1 second while queued/running
```

### Task and model behavior

`aeosys.audit` version 1 has `start`, `fetch`, and `agent` checkpoints. The initial transaction writes the audit and creates its task together. The agent phase persists a child conversation ID and page metadata; static HTML is stored separately in that child conversation's page document.

- `MAX_FETCH_ATTEMPTS = 1` and `MAX_AGENT_ATTEMPTS = 1`: **one application attempt each**. Backoff/retry branches exist but these constants disable extra attempts.
- Pi Durable model-generation retries remain enabled with `maxRetries: 2`, 1,000 ms base delay, and 5,000 ms maximum agent delay.
- Model stream timeout is 45,000 ms. Agent submission wait uses a 55,000 ms timeout; it aborts the child on timeout.
- These limits do not amount to a single enforced end-to-end audit deadline. Fetching and final performance collection sit outside the agent wait.
- The abort hook stops an agent browser when applicable and marks unfinished audits failed with `audit_aborted`. No public cancel endpoint exists.
- Agent execution attempts browser cleanup in `finally`; cleanup errors are reported without discarding a report, and sandboxes also expire.

### Agent tools and output

The audit extension exposes only:

| Tool | Behavior |
| --- | --- |
| `read_audit_skill` | Read allowlisted `seo-audit`, `ai-seo`, `core-web-vitals`, or `agent-browser` Markdown, restricted to `SKILL.md` or `references/<name>.md`. |
| `inspect_page` | Read final URL, status, static HTML capped at 60,000 characters, and truncation flag. |
| `bash` | Sequential, replay-unsafe shell execution in the audit sandbox; maximum eight tool calls, 15 seconds per command, with a 55-second budget. |

The model is instructed to review only the submitted/final page, avoid state changes, treat target content as untrusted, and return JSON. It is not given an API to publish changes.

The report schema permits a summary up to 2,000 characters and at most 20 findings. Parsing strips an optional JSON fence and root `$schema`, validates Zod structure, rejects extra inspected pages or any remaining URLs, requires finding sources to belong to inspected coverage, and generates application-owned finding/proposal IDs. Proposals are stamped `proposed` and `not-published`.

URL scope comparison uses origin plus pathname, with trailing slashes removed. It accepts the submitted and final redirect destinations and ignores query/fragment. Accepted sources are normalized to the final fetched URL. Scope validation is not independent validation of the evidence's truth or of generated markup.

## 4. Storage and runtime ownership

### Local

Without `VERCEL`, the app lazily opens Node SQLite storage at:

```text
AEOSYS_DURABLE_DB or <working directory>/.aeosys/audits.sqlite
```

The opened harness is cached on `globalThis` and resumed. This is local filesystem persistence, not in-memory-only state. Use a single owning process for that SQLite storage location.

### Vercel

With `VERCEL` set, `resumeWith` and `acquireHarness` integrate the same harness with Vercel Workflow World. `aeosys-audits` is the workflow name, not a session ID: sessions must be created by the SDK and identified by their returned `wrun_…` ID.

On first use, the app creates `aeosys_workflow_sessions` in the existing PostgreSQL database and stores one generated session ID per Vercel project/environment. A transaction-scoped advisory lock serializes bootstrap, so concurrent cold starts reuse the same session. The database role needs permission to create this table on initial deployment. Keep this mapping: deleting it disconnects the app from its existing audit reports. Production and Preview use distinct mappings, even when sharing a database.

Leases are cached and checked for fenced/closed storage; an unusable lease is released and reacquired. Failed initialization is evicted from the cache so later requests can retry. Traces are configured with `traceAudience: "private"`. This is the source-wired production path, not proof of a successful deployed run.

### Documents

All application audits share the harness root conversation's `aeosys.audits` document, version 2:

- `audits`: audit ID → normalized AuditResult.
- `advisorThreads`: `auditId:findingId` → numeric Pi Durable ConversationId.
- `verifications`: schema-backed storage retained, but no application verification workflow writes it.
- `advisorPromptUsed`: retained/defaulted map, but current advisor code does not use it to enforce single-use requests.

Store migration parses through `auditStoreSchema`; absent advisor maps default to empty objects. There is no user/account partition, record-retention job, audit list endpoint, or report-deletion endpoint.

Child conversations hold `aeosys.audit-page` snapshots and `aeosys.audit-browser` call/time counters. Advisor conversations are ownerless and referenced from the root map; their transcripts hold the messages returned to the UI.

## 5. HTTP and client contracts

| Method / route | Current behavior |
| --- | --- |
| `POST /api/audits` | Strict `{ "url": "http(s)://…" }`, trimmed URL up to 2,048 characters; creates audit and returns `202`. Public-network validation happens in the task, so a syntactically valid private URL can first receive a queued ID and later fail. |
| `GET /api/audits/{id}` | Validates UUID, returns current normalized AuditResult. |
| `POST /api/audits/{id}/findings/{findingId}/proposals` | Returns an existing proposal. Does not generate, approve, or revise it. |
| `GET /api/audits/{id}/findings/{findingId}/advisor` | Requires finding with proposal; returns persisted messages and `promptUsed`. |
| `POST /api/audits/{id}/findings/{findingId}/advisor` | Requires strict empty JSON `{}`. Server builds the fixed question and streams advisor events. Caller-written prompt/message properties are rejected. |
| `GET /api/openapi` | Returns OpenAPI document generated from application contracts. |
| `GET /api/docs` | Scalar API reference pointing at `/api/openapi`. |

There are no review, verify, publish, list, or cancel routes. Audit/proposal/advisor responses use `cache-control: no-store`.

Request parsing rejects declared `Content-Length` above 10,000 bytes, malformed JSON, and invalid schemas. This is a header-based check, not a streaming body-size cap. Invalid path IDs return `400`; missing audits/findings/proposals return `404`; a busy advisor returns `409`; unexpected errors become a generic `500`. Runtime errors use `{ error: { message } }`; OpenAPI error responses currently reuse `auditErrorSchema` rather than that envelope.

### Advisor generation

The service creates or reuses one conversation per finding, using the same Google model selection as audits but removing the audit tool extension. Its instructions include bounded finding/evidence/proposal context and explicitly prohibit claims of editing, testing, or publishing. It submits the fixed question with `whenBusy: "reject"` and a fresh request ID.

The response is SSE: `delta` contains text, `done` contains messages and `promptUsed: true`, and `error` contains a safe message. Only transcript user/assistant text is returned, capped at 8,000 characters per message. The response schema allows up to 40 messages, but the service does not trim the transcript to that count or enforce a lifetime request quota. Stream disconnect stops event watching; it does not explicitly abort the model generation.

### Browser state

TanStack Query caches created/results data, polls active audits every 1,000 ms, and stops polling terminal statuses. Provider defaults: 30-second stale time, five-minute garbage collection, one query retry, no window-focus refetch. Advisor replies use a POST fetch plus streamed SSE parser; final messages update query cache. Current audit selection is component state, not localStorage or URL state.

## 6. Fetching, sandbox, and performance

### Initial HTML request

`fetcher.ts` allows HTTP(S) without URL credentials; rejects localhost and configured private/reserved address ranges; chooses a public DNS answer and pins that address into Node's request lookup. Mixed public/private DNS answers are accepted only through a selected public address.

Each redirect destination is revalidated. Limits are three redirects, 1,000,000 response bytes, and an 8,000 ms socket timeout per request. An explicit non-HTML content type is rejected; an absent content type is accepted. HTTP 429/5xx are retryable fetch errors, but application attempts are currently limited to one. Redirect targets need not share the submitted hostname.

### Rendered audit browser

A sandbox is named from a hash of the child conversation ID and created/reused from `AGENT_BROWSER_SNAPSHOT_ID`. It receives no app files or credentials. Its configured network policy permits GET/HEAD on the audited hostname, denies configured IPv4 ranges, and blocks other methods/resources. IPv6 is disabled through `sysctl` before the shell command; failure blocks execution. Stdout is capped at 60,000 characters and stderr at 10,000.

The sandbox shell is general-purpose, not a strict command allowlist. A regex rejects some Python invocation forms, while model instructions prohibit Python/HTTP fallbacks and state-changing behavior. The hard controls are sandbox isolation and network policy, not that regex or perfect instruction following. Hostname isolation also does not guarantee every GET is side-effect-free.

### Performance collection

`finishAudit` measures the original submitted URL for every nonfailed audit, then saves the result:

1. With `CRUX_API_KEY`, POST to Chrome UX Report `records:queryRecord`, `formFactor: "PHONE"`, page URL, LCP/INP/CLS; eight-second timeout, no redirects, no origin fallback. Reads p75 metrics.
2. If field data is unavailable for any reason, try local `agent-browser --session audit-vitals vitals <url> --json`.
3. If local execution fails and a browser conversation ID plus snapshot are available, run that command in the audit sandbox with a 30-second command timeout.
4. Parse lab LCP/FCP/CLS or store unavailable. No lab INP is returned.

Classifications use good/poor bounds: LCP 2,500/4,000 ms; INP 200/500 ms; CLS 0.1/0.25; FCP 1,800/3,000 ms. There is no PageSpeed Insights request or aggregate performance score. Current output replaces unavailable CrUX information with the lab result rather than retaining both source attempts.

## 7. Checks and test status

Local setup documented in the repository uses Node 22+ and pnpm 11:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

| Environment variable | Used for |
| --- | --- |
| `GEMINI_API_KEY` | Enables AI review; without it audits use static partial fallback. Advisor has no separate no-key fallback. |
| `AEOSYS_GEMINI_MODEL` | Optional Google model override. |
| `AGENT_BROWSER_SNAPSHOT_ID` | Clean Vercel Sandbox image with Chromium and agent-browser preinstalled. |
| `CRUX_API_KEY` | Optional CrUX field-data query; API must be enabled in its Google Cloud project. |
| `AEOSYS_DURABLE_DB` | Optional local SQLite path; consumed by code but absent from `.env.example`. |
| `VERCEL` | Selects Vercel harness path; normally platform-provided. |
| `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID` | Optional local sandbox credentials; linked Vercel/OIDC setup is also used by the sandbox integration. |

A clean browser image can be created using the README's setup command:

```bash
node --env-file=.env.local --input-type=module -e \
  'import { createAgentBrowserSnapshot } from "@agent-browser/sandbox/vercel"; console.log(await createAgentBrowserSnapshot())'
```

Configure its returned ID in the environment. Do not include app secrets or authenticated browser sessions in that image. The local lab path additionally needs an executable `agent-browser`; it is not supplied as a standalone dependency/script by this package.

Checks executed during this documentation pass:

```bash
pnpm typecheck
pnpm exec tsx --test \
  src/lib/server/audit-agent/agent.test.ts \
  src/lib/server/audit-agent/browser.test.ts \
  src/lib/server/audits/fetcher.test.ts \
  src/lib/server/audits/core-web-vitals.test.ts \
  src/schemas/audit.schema.test.ts \
  src/components/audit-command-center/audit-metrics.test.tsx \
  src/components/audit-command-center/finding-details.test.tsx
```

- `pnpm typecheck`: passed.
- Combined test run on Node `v24.19.0`: **16 passed; two test files failed to load**. `agent.test.ts` hit `ERR_PACKAGE_PATH_NOT_EXPORTED` for `@earendil-works/chord/context`; `browser.test.ts` hit the same code for `@agent-browser/sandbox/vercel`. Both failed during the tsx/CommonJS loading path, before assertions. These results do not establish that Next's bundler has the same failure.
- Passing checks cover public-address selection, CrUX/lab parsing, locked advisor input, legacy-store defaults, metrics/filter rendering, and advisor conversation presentation.
- Agent scope and sandbox isolation test sources exist, but their assertions were not exercised in this run because of those loading failures.
- Package scripts expose `test:agent`, `test:fetcher`, and `test:cwv`; there is no umbrella `test` script. No end-to-end audit, browser walkthrough, production recovery, build, lint, or deployment test was performed in this pass.

## 8. Current limitations and operational caveats

These describe code as it stands, not implemented protections:

- **No access or shared cost control:** no authentication, per-user ownership, rate limiter, global concurrency cap, or daily spend limit. Per-review budgets do not bound total spending.
- **No full remediation loop:** proposal review statuses and verification contracts are schema/storage remnants. No approval/rejection mutations, post-fix validators, publishing integration, or report export exist.
- **Local lab browser is outside the audit firewall:** `execFile` invokes local agent-browser directly, with no explicit timeout or public-URL/redirect checks at that call site. Initial HTML validation does not enforce safety of later browser navigation or subresources.
- **Performance sandbox lifecycle differs:** agent cleanup runs before final performance collection. A lab fallback can recreate a sandbox afterward, outside the agent tool call counter, with no matching explicit stop in `finishAudit`; auto-expiry remains. It measures the original URL, which may differ from the final agent URL after redirects.
- **Mobile lab conditions are not established:** schema/UI mark lab results mobile, but the command does not configure mobile emulation explicitly.
- **Static fallback is narrow:** regex extraction can miss valid HTML forms; snapshots after agent failure may be truncated to 60,000 characters. No HTML/schema validator independently checks AI drafts.
- **Coverage is partly self-reported:** report structure and source scope are enforced; successful inspection and factual evidence are not independently proven. The UI displays the first partial limitation rather than a complete coverage panel.
- **Advisor single-use is UI-only:** repeated idle API requests generate additional responses. Busy rejection is concurrency handling, not a usage quota. It never rewrites the stored proposal.
- **Errors and tests need interpretation:** OpenAPI error envelopes differ from runtime responses, and two tests currently fail at module loading. Passing types are not end-to-end runtime proof.
