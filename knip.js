/** @type {import('knip').KnipConfig} */
module.exports = {
  entry: ["src/**/*.test.{ts,tsx}", "neon.ts"],
  ignore: [".agents/**"],
  // Browser smoke tests use the externally installed CLI.
  ignoreBinaries: ["agent-browser"],
  // Workflow resolves the selected World from the app root at runtime.
  ignoreDependencies: ["@workflow/world-local", "@workflow/world-vercel"],
}
