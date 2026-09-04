import type { Inspection } from "../domain/inspection";
import { DEV_USER_ID } from "../domain/inspection";

const STORAGE_KEY = "pathwarden.inspections.v1";

export interface InspectionStore {
  list(): Promise<Inspection[]>;
  create(
    input: Omit<Inspection, "id" | "createdAt" | "updatedAt" | "userId"> & {
      userId?: string;
    },
  ): Promise<Inspection>;
}

interface StoredState {
  inspections: Inspection[];
}

function readState(): StoredState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { inspections: [] };
  try {
    const parsed = JSON.parse(raw) as StoredState;
    return { inspections: Array.isArray(parsed.inspections) ? parsed.inspections : [] };
  } catch {
    return { inspections: [] };
  }
}

function writeState(state: StoredState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const localInspectionStore: InspectionStore = {
  async list() {
    return readState().inspections;
  },

  async create(input) {
    const now = new Date().toISOString();
    const inspection: Inspection = {
      id: crypto.randomUUID(),
      pathId: input.pathId,
      userId: input.userId ?? DEV_USER_ID,
      inspectedAt: input.inspectedAt,
      condition: input.condition,
      notes: input.notes?.trim() ? input.notes.trim() : undefined,
      createdAt: now,
      updatedAt: now,
    };

    const state = readState();
    state.inspections.push(inspection);
    writeState(state);
    return inspection;
  },
};
