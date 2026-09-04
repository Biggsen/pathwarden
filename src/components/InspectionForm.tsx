import type { FormEvent } from "react";
import { useState } from "react";
import type { InspectionCondition } from "../domain/inspection";

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

interface InspectionFormProps {
  pathCode: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: {
    inspectedAt: string;
    condition: InspectionCondition;
    notes?: string;
  }) => Promise<void>;
}

export default function InspectionForm({
  pathCode,
  saving,
  onCancel,
  onSave,
}: InspectionFormProps) {
  const [inspectedAt, setInspectedAt] = useState(todayIsoDate);
  const [condition, setCondition] = useState<InspectionCondition>("clear");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSave({
        inspectedAt,
        condition,
        notes: notes.trim() || undefined,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save inspection");
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Record inspection
        </p>
        <p className="mt-1 text-lg font-semibold">{pathCode}</p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Date</span>
        <input
          type="date"
          required
          value={inspectedAt}
          onChange={(event) => setInspectedAt(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <fieldset className="space-y-2 text-sm">
        <legend className="font-medium text-slate-700">Condition</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="condition"
            checked={condition === "clear"}
            onChange={() => setCondition("clear")}
          />
          Clear / no problem
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="condition"
            checked={condition === "issue"}
            onChange={() => setCondition("issue")}
          />
          Issue found
        </label>
      </fieldset>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Optional"
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save inspection"}
        </button>
      </div>
    </form>
  );
}
