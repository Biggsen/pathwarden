import type { Inspection } from "../domain/inspection";
import { getSupabase } from "./supabase";
import { requireUserId } from "./auth";

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

interface InspectionRow {
  id: string;
  path_id: string;
  user_id: string;
  inspected_at: string;
  condition: Inspection["condition"];
  notes: string | null;
  reported_to_escc: boolean;
  created_at: string;
  updated_at: string;
}

const LOCAL_KEY = "pathwarden.inspections.v1";

function fromRow(row: InspectionRow): Inspection {
  return {
    id: row.id,
    pathId: row.path_id,
    userId: row.user_id,
    inspectedAt: row.inspected_at,
    condition: row.condition,
    notes: row.notes?.trim() ? row.notes : undefined,
    reportedToEscc: row.reported_to_escc,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toWrite(input: InspectionInput, userId: string) {
  return {
    path_id: input.pathId,
    user_id: userId,
    inspected_at: input.inspectedAt,
    condition: input.condition,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    reported_to_escc:
      input.condition === "issue" && input.reportedToEscc === true,
    updated_at: new Date().toISOString(),
  };
}

function readLocalInspections(): Inspection[] {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { inspections?: Inspection[] };
    return Array.isArray(parsed.inspections) ? parsed.inspections : [];
  } catch {
    return [];
  }
}

async function migrateLocalInspections(userId: string): Promise<void> {
  const local = readLocalInspections();
  if (local.length === 0) return;
  const db = getSupabase();
  const { data, error } = await db.from("inspections").select("id").limit(1);
  if (error) throw error;
  if ((data ?? []).length > 0) {
    localStorage.removeItem(LOCAL_KEY);
    return;
  }
  const rows = local.map((inspection) => ({
    id: inspection.id,
    path_id: inspection.pathId,
    user_id: userId,
    inspected_at: inspection.inspectedAt,
    condition: inspection.condition,
    notes: inspection.notes?.trim() ? inspection.notes.trim() : null,
    reported_to_escc: inspection.reportedToEscc === true,
    created_at: inspection.createdAt,
    updated_at: inspection.updatedAt,
  }));
  const { error: insertError } = await db.from("inspections").insert(rows);
  if (insertError) throw insertError;
  localStorage.removeItem(LOCAL_KEY);
}

export const inspectionStore: InspectionStore = {
  async list() {
    const userId = await requireUserId();
    await migrateLocalInspections(userId);
    const { data, error } = await getSupabase()
      .from("inspections")
      .select("*")
      .eq("user_id", userId)
      .order("inspected_at", { ascending: false });
    if (error) throw error;
    return (data as InspectionRow[]).map(fromRow);
  },

  async create(input) {
    const userId = await requireUserId();
    const { data, error } = await getSupabase()
      .from("inspections")
      .insert(toWrite(input, userId))
      .select("*")
      .single();
    if (error) throw error;
    return fromRow(data as InspectionRow);
  },

  async update(id, input) {
    const userId = await requireUserId();
    const { data, error } = await getSupabase()
      .from("inspections")
      .update(toWrite(input, userId))
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return fromRow(data as InspectionRow);
  },
};
