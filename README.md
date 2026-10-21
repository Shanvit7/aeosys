<p align="center">
  <img src="./src/app/icon.svg" alt="Aeosys logo" width="80" height="80">
</p>

<h1 align="center">Aeosys</h1>

<p align="center">A focused SEO and answer-readiness review for one page.</p>

<p align="center">
  <a href="./docs/system.md">System overview</a> ·
  <a href="./docs/tech.md">Technical documentation</a>
</p>

## What it does

Submit a public page URL, review source-linked findings, and copy suggested edits. Findings with a draft fix also offer a prepared question to an AI advisor, with a streamed explanation.

- **Page-level review:** Gemini reviews supplied HTML using installed SEO, AI SEO, and Core Web Vitals skills, with optional sandboxed browser inspection.
- **Evidence and suggestions:** findings include severity, category, observed evidence, source URL, and an optional draft fix that is never applied or published by the app.
- **Performance data:** Chrome UX Report supplies page-level phone LCP, INP, and CLS at the 75th percentile when available. Otherwise, browser lab measurements can supply LCP, FCP, and CLS. Field and lab data are labeled separately.
- **Graceful fallback:** without a Gemini key, or if AI review fails, static HTML checks return a `partial` report covering status, titles, descriptions, canonical presence, H1 count, and malformed inline JSON-LD.
- **Persisted background work:** Pi Durable runs audits with SQLite locally and Vercel Workflow World integration on Vercel.

```text
Page URL → background audit → findings + performance
                           → inspect evidence → copy draft
                                              → ask advisor
```

This is a single-page review, not a site crawler. Suggested edits are not applied, approved, or verified by the app. Readiness checks do not measure rankings, traffic, citations, or AI-search visibility.

## Run locally

Requires **Node.js 22+** and **pnpm 11**.

```bash
pnpm install
cp .env.example .env.local
# Configure optional integrations in .env.local.
pnpm dev
```

Open [localhost:3000](http://localhost:3000).

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Enables AI audits and the finding advisor. Without it, audits use static fallback; advisor generation is unavailable. |
| `AEOSYS_GEMINI_MODEL` | Optional model override; defaults to `gemini-flash-lite-latest`. |
| `AGENT_BROWSER_SNAPSHOT_ID` | Clean Vercel Sandbox snapshot for rendered page inspection. |
| `CRUX_API_KEY` | Optional real-user performance data; enable the Chrome UX Report API in the matching Google Cloud project. |
| `AEOSYS_DURABLE_DB` | Optional local SQLite path; defaults to `.aeosys/audits.sqlite`. |

Local SQLite storage must have one owning process. Keep credentials server-side and out of version control.

### Browser setup

Authenticate with Vercel CLI and link the project for local OIDC credentials, or configure the local sandbox credential variables in `.env.example`. Deployed Vercel apps use platform OIDC.

Create a clean browser snapshot:

```bash
node --env-file=.env.local --input-type=module -e \
  'import { createAgentBrowserSnapshot } from "@agent-browser/sandbox/vercel"; console.log(await createAgentBrowserSnapshot())'
```

Set the printed ID as `AGENT_BROWSER_SNAPSHOT_ID`. Never include app credentials, application files, or authenticated browser sessions in the snapshot. Sandbox usage is subject to [Vercel Sandbox pricing and quotas](https://vercel.com/docs/sandbox/pricing).

Audit browser tools allow eight shell calls, 15 seconds per call, with a 55-second agent budget. The sandbox restricts network requests to GET/HEAD on the audited hostname and blocks private networks and third-party resources. These restrictions can affect rendering. Without sandbox access, rendered checks may be unavailable.

Lab performance collection first tries a local `agent-browser` executable, then the audit sandbox when an agent conversation and snapshot are available. If neither works, performance data is marked unavailable. The lab command does not explicitly configure mobile emulation, despite the current UI label.

## Architecture

- **UI:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, shadcn/Base UI, TanStack Query.
- **API:** Next.js Route Handlers and shared Zod contracts; the browser polls active audits every second. Advisor responses use server-sent events.
- **Execution:** Pi Durable with the Google model provider, installed Markdown skills, and an isolated browser sandbox. One application fetch attempt and one agent attempt; model-generation retries are configured separately.
- **Persistence:** a shared durable root store holds reports and advisor thread references. No user-account partitioning.
- **Fetch safety:** HTTP(S) only, public DNS address pinning, redirect revalidation, three-redirect limit, 1 MB response cap, and an eight-second socket timeout per request.

Details: [technical implementation](./docs/tech.md) and [current system behavior](./docs/system.md).

## API

Interactive reference: [localhost:3000/api/docs](http://localhost:3000/api/docs). OpenAPI document: [localhost:3000/api/openapi](http://localhost:3000/api/openapi).

```bash
# Queue a page audit; use the returned auditId below.
curl -X POST http://localhost:3000/api/audits \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'

# Poll status and results.
curl 'http://localhost:3000/api/audits/<auditId>'

# Return an existing finding proposal.
curl -X POST \
  'http://localhost:3000/api/audits/<auditId>/findings/<findingId>/proposals'

# Stream an advisor explanation using the server-generated question.
curl -N -X POST \
  'http://localhost:3000/api/audits/<auditId>/findings/<findingId>/advisor' \
  -H 'content-type: application/json' \
  -d '{}'
```

Advisor accepts no caller-written question. The UI offers one prepared send action per finding; the API rejects concurrent replies but does not enforce a lifetime single-use quota.

## Deploy to Vercel

The `durable-harness/next` wrapper supplies queue/recovery integration. The Vercel runtime uses Workflow World rather than local SQLite files.

Configure `GEMINI_API_KEY` and `AGENT_BROWSER_SNAPSHOT_ID` for AI review with rendered inspection; add `CRUX_API_KEY` for field performance data. `AEOSYS_GEMINI_MODEL` is optional. See [runtime and storage details](./docs/tech.md#4-storage-and-runtime-ownership).

> **Not ready for unrestricted public use.** There is no authentication, shared rate limiting, per-user isolation, or daily spend cap. Per-agent budgets do not limit total usage. The local lab-browser path also runs outside the audit sandbox firewall. Add access and cost controls and address the documented security gaps before exposing live audits publicly.

## Development checks

```bash
pnpm typecheck
pnpm lint
pnpm test:fetcher
pnpm test:cwv
pnpm test:agent
pnpm build
```

The last documentation-pass check found TypeScript passing and 16 tests passing, with two agent/browser test files blocked by package-export resolution errors under tsx. These commands are not a claim of a fully passing build or end-to-end suite. See [test status and caveats](./docs/tech.md#7-checks-and-test-status).
