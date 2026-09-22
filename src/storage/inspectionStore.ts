import type { Inspection } from "../domain/inspection";
import { DEV_USER_ID } from "../domain/inspection";

const STORAGE_KEY = "pathwarden.inspections.v1";

export type InspectionInput = Omit<
  Inspection,
  "id" | "createdAt" | "updatedAt" | "userId"
> & {
  userId?: string;
};

export interface InspectionStore {
  list(): Promise<Inspection[]>;
  create(input: InspectionInput): Promise<Inspection>;
  update(id: string, input: InspectionInput): Promise<Inspection>;
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
      reportedToEscc:
        input.condition === "issue" && input.reportedToEscc === true,
      createdAt: now,
      updatedAt: now,
    };

    const state = readState();
    state.inspections.push(inspection);
    writeState(state);
    return inspection;
  },

  async update(id, input) {
    const state = readState();
    const index = state.inspections.findIndex((inspection) => inspection.id === id);
    if (index === -1) {
      throw new Error("Inspection not found");
    }

    const current = state.inspections[index];
    const now = new Date().toISOString();
    const updated: Inspection = {
      ...current,
      pathId: input.pathId,
      userId: input.userId ?? current.userId,
      inspectedAt: input.inspectedAt,
      condition: input.condition,
      notes: input.notes?.trim() ? input.notes.trim() : undefined,
      reportedToEscc:
        input.condition === "issue" && input.reportedToEscc === true,
      updatedAt: now,
    };

    state.inspections[index] = updated;
    writeState(state);
    return updated;
  },
};
