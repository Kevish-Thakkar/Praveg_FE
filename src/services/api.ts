import { persist } from "@/mock/db"
import { processScheduledEmails } from "./scheduler"
import { useDemoStore } from "@/store/demo.store"

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Simulated network boundary. Every service call goes through here so that:
 *  - the UI experiences realistic latency (skeletons, disabled buttons),
 *  - errors can be simulated from the demo menu,
 *  - callers always receive a copy (UI can never mutate the mock DB directly).
 * Replacing the mock with REST means swapping the body of each service for fetch().
 */
export async function request<T>(handler: () => T, opts: { mutate?: boolean } = {}): Promise<T> {
  const { latencyMs, simulateErrors } = useDemoStore.getState()
  await sleep(latencyMs * (opts.mutate ? 1.4 : 1) * (0.7 + Math.random() * 0.6))
  if (simulateErrors) {
    throw new ApiError("The server could not be reached. Please try again.", 503)
  }
  processScheduledEmails()
  const result = handler()
  if (opts.mutate) persist()
  return structuredClone(result)
}

export function notFound(entity: string): never {
  throw new ApiError(`${entity} not found`, 404)
}
