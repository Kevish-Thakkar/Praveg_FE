import { create } from "zustand"

/** Demo-only controls for exercising loading and error states without a backend. */
interface DemoState {
  simulateErrors: boolean
  latencyMs: number
  setSimulateErrors: (v: boolean) => void
}

export const useDemoStore = create<DemoState>((set) => ({
  simulateErrors: false,
  latencyMs: 450,
  setSimulateErrors: (simulateErrors) => set({ simulateErrors }),
}))
