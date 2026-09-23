import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import ParishPicker from "./ParishPicker";
import { profileStore } from "../storage/profileStore";

interface AccountPageProps {
  onClose: () => void;
  ownedParishes: string[];
  catalog: string[];
  catalogLoading: boolean;
  catalogError: string | null;
  editParishes: boolean;
  onRequestCatalog: () => void;
  onToggleOwned: (parish: string, owned: boolean) => void;
}

export default function AccountPage({
  onClose,
  ownedParishes,
  catalog,
  catalogLoading,
  catalogError,
  editParishes,
  onRequestCatalog,
  onToggleOwned,
}: AccountPageProps) {
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingParishes, setEditingParishes] = useState(editParishes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    profileStore
      .read()
      .then((profile) => {
        if (cancelled) return;
        setName(profile.displayName);
        setDraft(profile.displayName);
        setEmail(profile.email);
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error ? loadError.message : "Could not load account",
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function startParishEdit() {
    setEditingParishes(true);
    onRequestCatalog();
  }

  function startEditing() {
    setDraft(name);
    setEditing(true);
    setSaved(false);
    setError(null);
  }

  function cancelEditing() {
    setDraft(name);
    setEditing(false);
    setError(null);
  }

  async function saveName(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const next = await profileStore.updateDisplayName(draft);
      setName(next);
      setDraft(next);
      setEditing(false);
      setSaved(true);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Could not save name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Account</h2>
            <p className="mt-1 text-sm text-slate-500">Your warden profile.</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Back
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading account…</p>
        ) : (
          <>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              {editing ? (
                <form className="space-y-3" onSubmit={(event) => void saveName(event)}>
                  <label className="block">
                    <span className="font-medium text-slate-700">Name:</span>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving || draft.trim().length === 0}
                      className="cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="text-sm text-slate-600 underline underline-offset-2"
                      onClick={cancelEditing}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="font-medium text-slate-700">Name:</dt>
                  <dd className="text-slate-800">{name || "—"}</dd>
                  <button
                    type="button"
                    className="text-slate-600 underline underline-offset-2 hover:text-slate-900"
                    onClick={startEditing}
                  >
                    Change name
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="font-medium text-slate-700">Email:</dt>
              <dd className="text-slate-800">{email || "—"}</dd>
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            {saved ? <p className="text-sm text-slate-600">Name saved.</p> : null}
          </dl>
          <section className="mt-6 border-t border-slate-100 pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium text-slate-900">Your parishes</h3>
              {editingParishes ? (
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setEditingParishes(false)}
                >
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={startParishEdit}
                >
                  Update
                </button>
              )}
            </div>
            <ul className="mt-2 space-y-1 text-slate-800">
              {ownedParishes.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
            {editingParishes ? (
              <div className="mt-4">
                <ParishPicker
                  catalog={catalog}
                  owned={ownedParishes}
                  catalogLoading={catalogLoading}
                  catalogError={catalogError}
                  onToggleOwned={onToggleOwned}
                />
              </div>
            ) : null}
          </section>
          </>
        )}
      </div>
    </div>
  );
}
