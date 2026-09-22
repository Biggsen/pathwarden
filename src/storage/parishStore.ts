const ASSIGNMENT_KEY = "pathwarden.parishes.v1";
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

function readAssignment(): ParishAssignment {
  const raw = localStorage.getItem(ASSIGNMENT_KEY);
  if (!raw) {
    return { owned: [DEFAULT_PARISH], active: DEFAULT_PARISH };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ParishAssignment>;
    const owned = uniqueSorted(
      Array.isArray(parsed.owned) ? parsed.owned : [DEFAULT_PARISH],
    );
    const ownedOrDefault = owned.length > 0 ? owned : [DEFAULT_PARISH];
    const active =
      typeof parsed.active === "string" &&
      ownedOrDefault.some((name) => name.toLowerCase() === parsed.active!.toLowerCase())
        ? ownedOrDefault.find(
            (name) => name.toLowerCase() === parsed.active!.toLowerCase(),
          ) ?? ownedOrDefault[0]
        : ownedOrDefault[0];
    return { owned: ownedOrDefault, active };
  } catch {
    return { owned: [DEFAULT_PARISH], active: DEFAULT_PARISH };
  }
}

function writeAssignment(state: ParishAssignment): ParishAssignment {
  const owned = uniqueSorted(state.owned);
  const ownedOrDefault = owned.length > 0 ? owned : [DEFAULT_PARISH];
  const active = ownedOrDefault.some(
    (name) => name.toLowerCase() === state.active.toLowerCase(),
  )
    ? ownedOrDefault.find(
        (name) => name.toLowerCase() === state.active.toLowerCase(),
      ) ?? ownedOrDefault[0]
    : ownedOrDefault[0];
  const next = { owned: ownedOrDefault, active };
  localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(next));
  return next;
}

export const localParishStore = {
  read(): ParishAssignment {
    return readAssignment();
  },

  setActive(parish: string): ParishAssignment {
    const current = readAssignment();
    const owned = current.owned.some(
      (name) => name.toLowerCase() === parish.toLowerCase(),
    )
      ? current.owned
      : uniqueSorted([...current.owned, parish]);
    return writeAssignment({ owned, active: parish });
  },

  setOwned(parish: string, owned: boolean): ParishAssignment {
    const current = readAssignment();
    if (owned) {
      const names = uniqueSorted([...current.owned, parish]);
      return writeAssignment({ owned: names, active: parish });
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
