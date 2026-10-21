/** @type {import('knip').KnipConfig} */
module.exports = {
  entry: ["src/**/*.test.{ts,tsx}"],
  ignore: [".agents/**"],
  // Workflow resolves the selected World from the app root at runtime.
  ignoreDependencies: ["@workflow/world-local", "@workflow/world-vercel"],
}
