import { type CoreWebVitals, coreWebVitalsSchema } from "@/schemas/core-web-vitals.schema"

const metricConfig = {
  lcp: { key: "largest_contentful_paint", threshold: 2_500, unit: "ms", poor: 4_000 },
  inp: { key: "interaction_to_next_paint", threshold: 200, unit: "ms", poor: 500 },
  cls: { key: "cumulative_layout_shift", threshold: 0.1, unit: "score", poor: 0.25 },
  fcp: { key: "first_contentful_paint", threshold: 1_800, unit: "ms", poor: 3_000 },
} as const

const metricStatus = (value: number, key: keyof typeof metricConfig) =>
  value <= metricConfig[key].threshold
    ? "good"
    : value <= metricConfig[key].poor
      ? "needs-improvement"
      : "poor"

export const parseCruxResponse = (payload: unknown, checkedAt = new Date().toISOString()) => {
  if (!payload || typeof payload !== "object") return undefined
  const record = (
    payload as { record?: { metrics?: Record<string, { percentiles?: { p75?: number } }> } }
  ).record
  if (!record?.metrics) return undefined

  const fieldData = Object.fromEntries(
    (["lcp", "inp", "cls"] as const).flatMap((key) => {
      const value = record.metrics?.[metricConfig[key].key]?.percentiles?.p75
      return typeof value === "number"
        ? [
            [
              key,
              {
                value,
                unit: metricConfig[key].unit,
                threshold: metricConfig[key].threshold,
                status: metricStatus(value, key),
              },
            ],
          ]
        : []
    }),
  )
  if (!Object.keys(fieldData).length) return undefined

  return coreWebVitalsSchema.parse({
    source: "Chrome UX Report",
    status: "available",
    strategy: "mobile",
    checkedAt,
    fieldData: { scope: "page", ...fieldData },
  })
}

const unavailable = (checkedAt: string, unavailableReason: string): CoreWebVitals =>
  coreWebVitalsSchema.parse({
    source: "Chrome UX Report",
    status: "unavailable",
    strategy: "mobile",
    checkedAt,
    unavailableReason,
  })

type BrowserVitals = {
  data?: {
    lcp?: { startTime?: number }
    fcp?: number
    inp?: number | null
    cls?: { score?: number }
  }
}

// `agent-browser vitals` reports load-time lab timings only; INP needs trusted input and
// never appears in this path, so INP comes from CrUX field data alone.
export const parseBrowserVitals = (payload: unknown, checkedAt = new Date().toISOString()) => {
  const data = (payload as BrowserVitals | undefined)?.data
  if (!data) return undefined

  const values = {
    lcp: data.lcp?.startTime,
    fcp: typeof data.fcp === "number" ? data.fcp : undefined,
    cls: data.cls?.score,
  }
  const labData = Object.fromEntries(
    (["lcp", "fcp", "cls"] as const).flatMap((key) => {
      const value = values[key]
      return typeof value === "number" && Number.isFinite(value)
        ? [
            [
              key,
              {
                value,
                unit: metricConfig[key].unit,
                threshold: metricConfig[key].threshold,
                status: metricStatus(value, key),
              },
            ],
          ]
        : []
    }),
  )
  if (!Object.keys(labData).length) return undefined

  return coreWebVitalsSchema.parse({
    source: "Chrome",
    status: "available",
    strategy: "mobile",
    checkedAt,
    labData,
  })
}

export const measureLabCoreWebVitals = async (
  runVitals: () => Promise<unknown>,
): Promise<CoreWebVitals> => {
  const checkedAt = new Date().toISOString()
  try {
    return (
      parseBrowserVitals(await runVitals(), checkedAt) ??
      unavailable(checkedAt, "Core Web Vitals could not be measured for this page.")
    )
  } catch {
    return unavailable(checkedAt, "Core Web Vitals could not be measured for this page.")
  }
}

export const measureCoreWebVitals = async (url: string): Promise<CoreWebVitals> => {
  const checkedAt = new Date().toISOString()
  const apiKey = process.env.CRUX_API_KEY
  if (!apiKey) return unavailable(checkedAt, "No field data source configured.")

  try {
    const endpoint = new URL("https://chromeuxreport.googleapis.com/v1/records:queryRecord")
    endpoint.searchParams.set("key", apiKey)
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url,
        formFactor: "PHONE",
        metrics: [
          "largest_contentful_paint",
          "interaction_to_next_paint",
          "cumulative_layout_shift",
        ],
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) {
      return unavailable(checkedAt, `Chrome UX Report returned HTTP ${response.status}.`)
    }

    return (
      parseCruxResponse(await response.json(), checkedAt) ??
      unavailable(checkedAt, "Chrome UX Report has no field data for this page yet.")
    )
  } catch {
    return unavailable(checkedAt, "Chrome UX Report could not be reached or returned invalid data.")
  }
}
