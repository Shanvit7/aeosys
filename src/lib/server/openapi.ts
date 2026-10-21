import {
  advisorChatRequestSchema,
  advisorChatResponseSchema,
  auditErrorSchema,
  auditFindingSchema,
  auditResultSchema,
  createAuditSchema,
  fixProposalSchema,
} from "@/schemas/audit.schema"
import { jsonResponseSchema, jsonSchema } from "@/schemas/openapi.schema"

const response = jsonResponseSchema

export const openapi = {
  openapi: "3.1.1",
  info: {
    title: "Aeosys API",
    version: "0.1.0",
    description:
      "Page-level SEO and answer-readiness audits with source-linked findings and explicit limitations. Rankings and AI visibility require separate measurements.",
  },
  paths: {
    "/api/audits": {
      post: {
        summary: "Queue a single-page audit",
        requestBody: {
          required: true,
          content: { "application/json": { schema: jsonSchema(createAuditSchema) } },
        },
        responses: {
          "202": response("Queued audit", auditResultSchema),
          "400": response("Invalid request", auditErrorSchema),
        },
      },
    },
    "/api/audits/{id}": {
      get: {
        summary: "Get audit status and findings",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": response("Audit", auditResultSchema),
          "404": response("Audit not found", auditErrorSchema),
        },
      },
    },
    "/api/audits/{id}/findings/{findingId}/proposals": {
      post: {
        summary: "Return a proposal for a finding",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "findingId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": response("Proposal", fixProposalSchema),
          "404": response("Proposal unavailable", auditErrorSchema),
        },
      },
    },
    "/api/audits/{id}/findings/{findingId}/advisor": {
      get: {
        summary: "Get advisor conversation for a finding",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "findingId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": response("Advisor conversation", advisorChatResponseSchema),
          "404": response("Finding or suggestion not found", auditErrorSchema),
        },
      },
      post: {
        summary: "Ask advisor about a finding",
        description:
          "User explicitly sends a locked, prefilled prompt about the suggested fix. Server generates the prompt from the finding; caller-provided text is rejected. Opening the drawer never submits a request. Advisor is read-only and cannot modify or publish the website.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "findingId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: jsonSchema(advisorChatRequestSchema) } },
        },
        responses: {
          "200": {
            description:
              "Server-sent events: `delta` with reply text, then `done` with the full conversation, or `error`.",
            content: { "text/event-stream": { schema: { type: "string" } } },
          },
          "400": response("Invalid request", auditErrorSchema),
          "404": response("Finding or suggestion not found", auditErrorSchema),
          "409": response("Advisor is already replying", auditErrorSchema),
        },
      },
    },
  },
  components: { schemas: { AuditFinding: jsonSchema(auditFindingSchema) } },
} as const
