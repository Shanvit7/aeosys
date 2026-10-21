import { lookup } from "node:dns/promises"
import { get as getHttp } from "node:http"
import { get as getHttps } from "node:https"
import { BlockList, isIP } from "node:net"

const MAX_BYTES = 1_000_000
const MAX_REDIRECTS = 3
const TIMEOUT_MS = 8_000

export class AuditFetchError extends Error {
  constructor(
    message: string,
    readonly code = "fetch_failed",
    readonly retryable = false,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = "AuditFetchError"
  }
}

export const blockedNetworkRanges = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/3",
  "::/128",
  "::1/128",
  "::ffff:0:0/96",
  "64:ff9b:1::/48",
  "100::/64",
  "2001:db8::/32",
  "2002::/16",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
]
const blockedNetworks = { ipv4: new BlockList(), ipv6: new BlockList() }
for (const range of blockedNetworkRanges) {
  const [address, prefix] = range.split("/")
  const family = address.includes(":") ? "ipv6" : "ipv4"
  blockedNetworks[family].addSubnet(address, Number(prefix), family)
}

const isPrivateAddress = (address: string) => {
  const family = address.includes(":") ? "ipv6" : "ipv4"
  return blockedNetworks[family].check(address, family)
}

export const selectPublicAddress = <T extends { address: string }>(addresses: T[]) => {
  const address = addresses.find((candidate) => !isPrivateAddress(candidate.address))
  if (!address) throw new AuditFetchError("Private network addresses are not allowed")
  return address
}

const retryableNetworkCodes = new Set(["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ECONNREFUSED"])

const networkError = (error: unknown) => {
  const code =
    error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined
  return new AuditFetchError(
    "Could not fetch target URL",
    "fetch_failed",
    code !== undefined && retryableNetworkCodes.has(code),
    { cause: error },
  )
}

const publicAddress = async (hostname: string) => {
  if (hostname === "localhost" || hostname.endsWith(".localhost"))
    throw new AuditFetchError("Local addresses are not allowed")
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true, verbatim: true })
  return selectPublicAddress(addresses)
}

export const validatePublicUrl = async (input: string) => {
  const url = new URL(input)
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new AuditFetchError("Only public HTTP(S) URLs without credentials are allowed")
  }
  await publicAddress(url.hostname.replace(/^\[|\]$/g, ""))
  return url
}

const requestPage = async (url: URL) => {
  const resolved = await publicAddress(url.hostname.replace(/^\[|\]$/g, ""))
  const get = url.protocol === "https:" ? getHttps : getHttp

  return new Promise<{
    status: number
    headers: Record<string, string | string[] | undefined>
    body: string
  }>((resolve, reject) => {
    const request = get(
      url,
      {
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "AeosysAudit/0.1",
        },
        lookup: (_hostname, options, callback) => {
          if (typeof options === "object" && options.all) {
            callback(null, [resolved])
            return
          }
          callback(null, resolved.address, resolved.family)
        },
      },
      (response) => {
        const status = response.statusCode ?? 0
        const headers = response.headers
        if (status === 429 || status >= 500) {
          response.resume()
          reject(
            new AuditFetchError(
              "Target server is temporarily unavailable",
              "upstream_unavailable",
              true,
            ),
          )
          return
        }
        const type = headers["content-type"]
        if (type && !/^(text\/html|application\/xhtml\+xml)/i.test(type)) {
          response.resume()
          reject(new AuditFetchError("Target did not return an HTML document"))
          return
        }

        let size = 0
        const chunks: Buffer[] = []
        response.on("data", (chunk: Buffer) => {
          size += chunk.length
          if (size > MAX_BYTES) {
            request.destroy(new AuditFetchError("Target response exceeded 1 MB"))
            return
          }
          chunks.push(chunk)
        })
        response.on("end", () =>
          resolve({ status, headers, body: Buffer.concat(chunks).toString("utf8") }),
        )
      },
    )
    request.setTimeout(TIMEOUT_MS, () =>
      request.destroy(new AuditFetchError("Target request timed out", "fetch_timeout", true)),
    )
    request.on("error", (error) =>
      reject(error instanceof AuditFetchError ? error : networkError(error)),
    )
  })
}

export const fetchPublicHtml = async (input: string) => {
  let url = await validatePublicUrl(input)
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    let response: Awaited<ReturnType<typeof requestPage>>
    try {
      response = await requestPage(url)
    } catch (error) {
      if (error instanceof AuditFetchError) throw error
      throw networkError(error)
    }
    const location = Array.isArray(response.headers.location)
      ? response.headers.location[0]
      : response.headers.location
    if (response.status >= 300 && response.status < 400 && location) {
      if (redirects === MAX_REDIRECTS) throw new AuditFetchError("Target exceeded redirect limit")
      url = await validatePublicUrl(new URL(location, url).href)
      continue
    }
    return { ...response, url: url.toString() }
  }
  throw new AuditFetchError("Target could not be fetched")
}
