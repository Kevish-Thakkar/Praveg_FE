import type { Candidate, Inspector } from "@/types/domain"

export type CandidateRow = Candidate & { inspector: Inspector; hasCv: boolean }
