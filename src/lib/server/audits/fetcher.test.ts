import assert from "node:assert/strict"
import test from "node:test"
import { selectPublicAddress, validatePublicUrl } from "@/lib/server/audits/fetcher"

test("allows public DNS answers when hostname also resolves to a private address", () => {
  const publicAddress = { address: "8.8.8.8", family: 4 }
  assert.equal(
    selectPublicAddress([{ address: "192.168.1.1", family: 4 }, publicAddress]),
    publicAddress,
  )
})

test("validates public IPv4 URLs without IPv6 deny ranges matching them", async () => {
  assert.equal((await validatePublicUrl("https://8.232.188.78")).hostname, "8.232.188.78")
  await assert.rejects(validatePublicUrl("https://192.168.1.1"), /Private network addresses/)
  await assert.rejects(validatePublicUrl("https://[::1]"), /Private network addresses/)
})
