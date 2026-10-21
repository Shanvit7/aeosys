export const TAGS = {
  audits: {
    all: ["audits"] as const,
    detail: (id: string) => ["audits", id] as const,
    advisor: (auditId: string, findingId: string) =>
      ["audits", auditId, "advisor", findingId] as const,
  },
} as const
