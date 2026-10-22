const isAuditDiscoveryUrl = (value: string) =>
  /\/(?:robots\.txt|sitemap[^/]*\.xml)$/i.test(new URL(value).pathname)

export const auditedPageUrls = (urls: string[]) => urls.filter((url) => !isAuditDiscoveryUrl(url))
