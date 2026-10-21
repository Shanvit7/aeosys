import type { AuditFinding, FixProposal } from "@/schemas/audit.schema"

const attribute = (tag: string, name: string) => {
  return tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1]
}

const proposal = (
  id: string,
  before: string | undefined,
  after: string,
  rationale: string,
): FixProposal => {
  return {
    id,
    kind: "metadata",
    rationale,
    ...(before === undefined ? {} : { before }),
    after,
    status: "proposed",
    publicationStatus: "not-published",
  }
}

const finding = (input: Omit<AuditFinding, "id"> & { id: string }) => {
  return input
}

export const analyzePage = (auditId: string, sourceUrl: string, status: number, html: string) => {
  const findings: AuditFinding[] = []
  const hostname = new URL(sourceUrl).hostname
  const title = html
    .match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/\s+/g, " ")
    .trim()
  const descriptionTag = html.match(/<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*>/i)?.[0]
  const description = descriptionTag && attribute(descriptionTag, "content")
  const canonicalTag = html.match(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i)?.[0]
  const canonical = canonicalTag && attribute(canonicalTag, "href")
  const h1Count = (html.match(/<h1\b[^>]*>/gi) ?? []).length
  const jsonLdScripts = [
    ...html.matchAll(
      /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
  const invalidJsonLd = jsonLdScripts.some((match) => {
    try {
      JSON.parse(match[1])
      return false
    } catch {
      return true
    }
  })

  if (status < 200 || status >= 400) {
    findings.push(
      finding({
        id: `${auditId}:http-status`,
        title: "We couldn’t open this page",
        category: "crawlability",
        severity: "critical",
        evidence: {
          description: "The page’s response code",
          observedValue: String(status),
          expectedValue: "2xx or 3xx",
          sourceUrl,
          checkId: "http-status",
        },
        recommendation: "Make sure the page opens for visitors before changing its content.",
      }),
    )
  }

  if (!title) {
    const after = `<title>${hostname} | Clear page topic</title>`
    findings.push(
      finding({
        id: `${auditId}:title`,
        title: "This page is missing a title",
        category: "metadata",
        severity: "high",
        evidence: {
          description: "No title element was found.",
          expectedValue: "One descriptive title element",
          sourceUrl,
          checkId: "title-presence",
        },
        recommendation: "Give this page a short, specific title.",
        proposedFix: proposal(
          `${auditId}:title-proposal`,
          undefined,
          after,
          "A clear title helps people understand what this page is about.",
        ),
      }),
    )
  } else if (title.length > 60) {
    findings.push(
      finding({
        id: `${auditId}:title-length`,
        title: "This page’s title may be too long",
        category: "metadata",
        severity: "medium",
        evidence: {
          description: "The number of characters in the page title",
          observedValue: `${title.length} characters`,
          expectedValue: "About 60 characters or fewer",
          sourceUrl,
          checkId: "title-length",
        },
        recommendation: "Shorten the title while keeping the page’s main topic.",
        proposedFix: proposal(
          `${auditId}:title-proposal`,
          `<title>${title}</title>`,
          `<title>${title.slice(0, 57).trim()}...</title>`,
          "A shorter title is easier to scan in result snippets.",
        ),
      }),
    )
  }

  if (!description) {
    findings.push(
      finding({
        id: `${auditId}:description`,
        title: "A short search summary is missing",
        category: "metadata",
        severity: "medium",
        evidence: {
          description: "We couldn’t find a short summary of this page for search results.",
          expectedValue: "One factual page summary",
          sourceUrl,
          checkId: "meta-description",
        },
        recommendation: "Add a brief, accurate summary of this page.",
        proposedFix: proposal(
          `${auditId}:description-proposal`,
          undefined,
          '<meta name="description" content="Clear factual summary of this page.">',
          "A clear summary helps people understand this page before they open it.",
        ),
      }),
    )
  }

  if (!canonical) {
    findings.push(
      finding({
        id: `${auditId}:canonical`,
        title: "A preferred page address isn’t set",
        category: "metadata",
        severity: "low",
        evidence: {
          description: "We couldn’t find which page address you want search results to use.",
          expectedValue: "Canonical URL matching preferred page",
          sourceUrl,
          checkId: "canonical-presence",
        },
        recommendation:
          "If this page has alternate addresses, choose the one you want people to find.",
        proposedFix: proposal(
          `${auditId}:canonical-proposal`,
          undefined,
          `<link rel="canonical" href="${sourceUrl}">`,
          "This helps search results point to the right version of the page.",
        ),
      }),
    )
  }

  if (h1Count !== 1) {
    findings.push(
      finding({
        id: `${auditId}:h1`,
        title:
          h1Count === 0
            ? "This page is missing a main heading"
            : "This page has more than one main heading",
        category: "content-structure",
        severity: "medium",
        evidence: {
          description: "The number of main headings on this page",
          observedValue: String(h1Count),
          expectedValue: "1",
          sourceUrl,
          checkId: "h1-count",
        },
        recommendation: "Use one clear heading that explains what this page is about.",
      }),
    )
  }

  if (invalidJsonLd) {
    findings.push(
      finding({
        id: `${auditId}:json-ld-validity`,
        title: "Extra page details have a formatting problem",
        category: "structured-data",
        severity: "high",
        evidence: {
          description: "Some extra information on this page couldn’t be read.",
          expectedValue: "Valid JSON",
          sourceUrl,
          checkId: "json-ld-validity",
        },
        recommendation: "Fix the formatting so search engines can read this page’s extra details.",
      }),
    )
  }

  return findings
}
