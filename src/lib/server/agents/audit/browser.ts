import { createHash } from "node:crypto"
import { getSandboxCredentials } from "@agent-browser/sandbox/vercel"
import type { ConversationId } from "@earendil-works/pi-durable"
import { Sandbox } from "@vercel/sandbox"
import { blockedNetworkRanges, validatePublicUrl } from "@/lib/server/audits/fetcher"
import { logger } from "@/lib/server/logger"

const AUDIT_BROWSER_TIMEOUT_MS = 55_000
const sandboxName = (conversationId: ConversationId) =>
  `aeosys-${createHash("sha256").update(String(conversationId)).digest("hex").slice(0, 32)}`
// ponytail: cap discovered origins at 20; raise if real pages need more.
const MAX_ASSET_HOSTS = 20

export const assetHostsFromHtml = (html: string, pageUrl: string) => {
  const hosts = new Set<string>()
  const tags = html.matchAll(/<(?:img|script|source|video|audio|iframe|link)\b[^>]*>/gi)
  for (const [tag] of tags) {
    for (const [, rawValue] of tag.matchAll(/\b(?:src|href|poster|srcset)\s*=\s*["']([^"']+)/gi)) {
      for (const candidate of rawValue.split(",")) {
        const value = candidate.trim().split(/\s+/, 1)[0]
        try {
          const url = new URL(value, pageUrl)
          if (url.protocol === "https:") hosts.add(url.hostname)
        } catch {
          continue
        }
        if (hosts.size >= MAX_ASSET_HOSTS) return [...hosts]
      }
    }
  }
  return [...hosts]
}

export const runAuditCommand = async (
  conversationId: ConversationId,
  input: string,
  command: string,
  signal?: AbortSignal,
  timeoutMs = 15_000,
  resourceHosts: string[] = [],
) => {
  const snapshotId = process.env.AGENT_BROWSER_SNAPSHOT_ID
  if (!snapshotId) throw new Error("Set AGENT_BROWSER_SNAPSHOT_ID to enable agent-browser audits")
  const url = await validatePublicUrl(input)
  const hosts = new Set([url.hostname])
  const validatedResources = await Promise.allSettled(
    resourceHosts.map((host) => validatePublicUrl(`https://${host}`)),
  )
  for (const result of validatedResources) {
    if (result.status === "fulfilled") hosts.add(result.value.hostname)
  }
  const allowedHosts = [...hosts]
  const commandSignal = AbortSignal.any([
    AbortSignal.timeout(timeoutMs),
    ...(signal ? [signal] : []),
  ])
  // Use a clean, prebuilt image: bootstrap downloads must not bypass the audit firewall.
  let sandbox: Awaited<ReturnType<typeof Sandbox.getOrCreate>>
  try {
    sandbox = await Sandbox.getOrCreate({
      ...getSandboxCredentials(),
      name: sandboxName(conversationId),
      source: { type: "snapshot", snapshotId },
      persistent: false,
      timeout: AUDIT_BROWSER_TIMEOUT_MS,
      env: { AGENT_BROWSER_ALLOWED_DOMAINS: allowedHosts.join(",") },
      networkPolicy: {
        allow: Object.fromEntries(
          allowedHosts.map((host) => [
            host,
            [
              {
                match: { method: ["GET", "HEAD"] },
                transform: [{ headers: { host: host === url.hostname ? url.host : host } }],
              },
              { response: { statusCode: 403 } },
            ],
          ]),
        ),
        // Sandbox's API rejects IPv6 CIDRs; disable IPv6 in the VM before running commands.
        subnets: { deny: blockedNetworkRanges.filter((range) => !range.includes(":")) },
      },
      signal: commandSignal,
    })
    // Fail closed: retain private-network isolation without unsupported IPv6 firewall rules.
    const isolation = await sandbox.runCommand(
      "sudo",
      ["sysctl", "-w", "net.ipv6.conf.all.disable_ipv6=1", "net.ipv6.conf.default.disable_ipv6=1"],
      { signal: commandSignal, timeoutMs: 5_000 },
    )
    if (isolation.exitCode !== 0) throw new Error("Could not disable sandbox IPv6; audit blocked")
    // App files, API keys and Vercel credentials are never passed into the VM.
    const result = await sandbox.runCommand("bash", ["-lc", command], {
      signal: commandSignal,
      timeoutMs,
    })
    const stdout = (await result.stdout()).slice(0, 60_000)
    const stderr = (await result.stderr()).slice(0, 10_000)
    if (result.exitCode !== 0) {
      logger.warn("Audit browser command failed", {
        hostname: url.hostname,
        exitCode: result.exitCode,
        stderr: stderr
          .replace(/(https?:\/\/[^\s?#]+)[?#][^\s]*/g, "$1")
          .replace(/[\r\n]+/g, " ")
          .slice(0, 1_000),
      })
    }
    return { exitCode: result.exitCode, stdout, stderr }
  } catch (error) {
    logger.warn("Audit browser sandbox failed", {
      hostname: url.hostname,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined,
    })
    throw error
  }
}
