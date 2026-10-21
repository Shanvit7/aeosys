import { withDurableHarness } from "durable-harness/next"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/*": [
      "./.agents/skills/seo-audit/**/*.md",
      "./.agents/skills/ai-seo/**/*.md",
      "./.agents/skills/core-web-vitals/**/*.md",
      "./.agents/skills/agent-browser/**/*.md",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default withDurableHarness(nextConfig)
