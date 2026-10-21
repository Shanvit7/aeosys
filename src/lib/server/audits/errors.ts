import { ApiError } from "@/lib/server/api"

export class AuditNotFoundError extends ApiError {
  constructor(message: string) {
    super(404, message)
  }
}

export class ProposalNotFoundError extends ApiError {
  constructor(message: string) {
    super(404, message)
  }
}
