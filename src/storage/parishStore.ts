import { getSupabase } from "./supabase";
import { requireUserId } from "./auth";

const CATALOG_KEY = "pathwarden.parish-catalog.v1";

export const DEFAULT_PARISH = "Hellingly";

export interface ParishAssignment {
  owned: string[];
  active: string;
}

interface CatalogCache {
  parishes: string[];
}

function uniqueSorted(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.sort((a, b) => a.localeCompare(b, "en"));
}

function normalize(state: ParishAssignment): ParishAssignment {
  const owned = uniqueSorted(state.owned);
  const ownedOrDefault = owned.length > 0 ? owned : [DEFAULT_PARISH];
  const active = ownedOrDefault.some(
    (name) => name.toLowerCase() === state.active.toLowerCase(),
  )
    ? ownedOrDefault.find(
        (name) => name.toLowerCase() === state.active.toLowerCase(),
      ) ?? ownedOrDefault[0]
    : ownedOrDefault[0];
  return { owned: ownedOrDefault, active };
}

async function readAssignment(): Promise<ParishAssignment> {
  const userId = await requireUserId();
  const db = getSupabase();
  const [{ data: profile, error: profileError }, { data: rows, error: ownedError }] =
    await Promise.all([
      db.from("profiles").select("active_parish").eq("id", userId).maybeSingle(),
      db.from("parish_assignments").select("parish").eq("user_id", userId),
    ]);
  if (profileError) throw profileError;
  if (ownedError) throw ownedError;
  if (!profile) {
    const { error: insertError } = await db.from("profiles").insert({
      id: userId,
      active_parish: DEFAULT_PARISH,
    });
    if (insertError) throw insertError;
  }
  const ownedNames = (rows ?? []).map((row) => String(row.parish));
  if (ownedNames.length === 0) {
    const { error: assignError } = await db.from("parish_assignments").insert({
      user_id: userId,
      parish: DEFAULT_PARISH,
    });
    if (assignError) throw assignError;
  }
  return normalize({
    owned: ownedNames.length > 0 ? ownedNames : [DEFAULT_PARISH],
    active: profile?.active_parish ?? DEFAULT_PARISH,
  });
}

async function writeAssignment(state: ParishAssignment): Promise<ParishAssignment> {
  const next = normalize(state);
  const userId = await requireUserId();
  const db = getSupabase();
  const { error: profileError } = await db.from("profiles").upsert({
    id: userId,
    active_parish: next.active,
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  const { data: currentRows, error: listError } = await db
    .from("parish_assignments")
    .select("parish")
    .eq("user_id", userId);
  if (listError) throw listError;

  const current = uniqueSorted((currentRows ?? []).map((row) => String(row.parish)));
  const toAdd = next.owned.filter(
    (parish) => !current.some((name) => name.toLowerCase() === parish.toLowerCase()),
  );
  const toRemove = current.filter(
    (parish) => !next.owned.some((name) => name.toLowerCase() === parish.toLowerCase()),
  );

  if (toAdd.length > 0) {
    const { error } = await db.from("parish_assignments").insert(
      toAdd.map((parish) => ({ user_id: userId, parish })),
    );
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await db
      .from("parish_assignments")
      .delete()
      .eq("user_id", userId)
      .in("parish", toRemove);
    if (error) throw error;
  }
  return next;
}

export const parishStore = {
  async read(): Promise<ParishAssignment> {
    return readAssignment();
  },

  async setActive(parish: string): Promise<ParishAssignment> {
    const current = await readAssignment();
    const owned = current.owned.some(
      (name) => name.toLowerCase() === parish.toLowerCase(),
    )
      ? current.owned
      : uniqueSorted([...current.owned, parish]);
    return writeAssignment({ owned, active: parish });
  },

  async setOwned(parish: string, owned: boolean): Promise<ParishAssignment> {
    const current = await readAssignment();
    if (owned) {
      return writeAssignment({
        owned: uniqueSorted([...current.owned, parish]),
        active: parish,
      });
    }
    const remaining = current.owned.filter(
      (name) => name.toLowerCase() !== parish.toLowerCase(),
    );
    if (remaining.length === 0) return current;
    const active =
      current.active.toLowerCase() === parish.toLowerCase()
        ? remaining[0]
        : current.active;
    return writeAssignment({ owned: remaining, active });
  },

  readCatalog(): string[] | null {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as CatalogCache;
      return Array.isArray(parsed.parishes) ? parsed.parishes : null;
    } catch {
      return null;
    }
  },

  writeCatalog(parishes: string[]): string[] {
    const names = uniqueSorted(parishes);
    localStorage.setItem(CATALOG_KEY, JSON.stringify({ parishes: names }));
    return names;
  },
};
