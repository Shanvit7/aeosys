import assert from "node:assert/strict"
import { test } from "node:test"
import type { ConversationId } from "@earendil-works/pi-durable"
import { Sandbox } from "@vercel/sandbox"
import { assetHostsFromHtml, runAuditCommand } from "@/lib/server/agents/audit/browser"
import { blockedNetworkRanges } from "@/lib/server/audits/fetcher"

test("sandbox uses IPv4 CIDRs and disables IPv6 before running agent commands", async (t) => {
  const previous = process.env.AGENT_BROWSER_SNAPSHOT_ID
  process.env.AGENT_BROWSER_SNAPSHOT_ID = "test-snapshot"
  t.after(() => {
    if (previous === undefined) delete process.env.AGENT_BROWSER_SNAPSHOT_ID
    else process.env.AGENT_BROWSER_SNAPSHOT_ID = previous
  })
  const commands: string[] = []
  let isolationExitCode = 0
  t.mock.method(
    Sandbox,
    "getOrCreate",
    async (options: Parameters<typeof Sandbox.getOrCreate>[0]) => {
      assert.ok(options)
      assert.ok(typeof options.networkPolicy === "object")
      assert.deepEqual(
        options.networkPolicy.subnets?.deny,
        blockedNetworkRanges.filter((range) => !range.includes(":")),
      )
      assert.deepEqual(options.networkPolicy.allow, {
        "8.8.8.8": [
          { match: { method: ["GET", "HEAD"] }, transform: [{ headers: { host: "8.8.8.8" } }] },
          { response: { statusCode: 403 } },
        ],
      })
      return {
        runCommand: async (command: string, args: string[]) => {
          commands.push([command, ...args].join(" "))
          return { exitCode: isolationExitCode, stdout: async () => "ok", stderr: async () => "" }
        },
      }
    },
  )
  const id = 1 as ConversationId
  await runAuditCommand(id, "https://8.8.8.8", "agent-browser snapshot")
  assert.deepEqual(commands, [
    "sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1 net.ipv6.conf.default.disable_ipv6=1",
    "bash -lc agent-browser snapshot",
  ])
  commands.length = 0
  isolationExitCode = 1
  await assert.rejects(runAuditCommand(id, "https://8.8.8.8", "unsafe"), /audit blocked/)
  assert.equal(commands.length, 1)
})

test("asset host discovery includes page resources but not links", () => {
  assert.deepEqual(
    assetHostsFromHtml(
      '<img src="https://cdn.example.test/hero.webp"><a href="https://other.test">link</a><script src="//assets.example.test/app.js"></script>',
      "https://www.example.test/",
    ),
    ["cdn.example.test", "assets.example.test"],
  )
})

test("sandbox allows discovered public asset hosts only", async (t) => {
  const previous = process.env.AGENT_BROWSER_SNAPSHOT_ID
  process.env.AGENT_BROWSER_SNAPSHOT_ID = "test-snapshot"
  t.after(() => {
    if (previous === undefined) delete process.env.AGENT_BROWSER_SNAPSHOT_ID
    else process.env.AGENT_BROWSER_SNAPSHOT_ID = previous
  })
  t.mock.method(
    Sandbox,
    "getOrCreate",
    async (options: Parameters<typeof Sandbox.getOrCreate>[0]) => {
      assert.ok(options)
      assert.ok(typeof options.networkPolicy === "object")
      assert.deepEqual(options.networkPolicy.allow, {
        "8.8.8.8": [
          {
            match: { method: ["GET", "HEAD"] },
            transform: [{ headers: { host: "8.8.8.8" } }],
          },
          { response: { statusCode: 403 } },
        ],
        "1.1.1.1": [
          {
            match: { method: ["GET", "HEAD"] },
            transform: [{ headers: { host: "1.1.1.1" } }],
          },
          { response: { statusCode: 403 } },
        ],
      })
      assert.equal(options.env, undefined)
      return {
        runCommand: async () => ({ exitCode: 0, stdout: async () => "ok", stderr: async () => "" }),
      }
    },
  )
  await runAuditCommand(
    1 as ConversationId,
    "https://8.8.8.8",
    "agent-browser vitals",
    undefined,
    undefined,
    ["1.1.1.1", "127.0.0.1"],
  )
})
