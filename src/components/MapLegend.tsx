import { PATH_TYPE_STYLES } from "../domain/path";

const inspectionItems = [
  { key: "not_inspected", label: "Not inspected", colour: "bg-slate-400", faded: true },
  { key: "inspected", label: "Inspected", colour: "bg-slate-700", faded: false },
  { key: "issue", label: "Issue", colour: "bg-fuchsia-600", faded: false },
] as const;

export default function MapLegend() {
  return (
    <div className="pointer-events-none absolute right-14 top-3 z-10 hidden max-w-[11.5rem] rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-700 shadow sm:block">
      <p className="font-medium text-slate-500">Path type</p>
      <ul className="mt-1 space-y-1">
        {PATH_TYPE_STYLES.map((item) => (
          <li key={item.type} className="flex items-center gap-2">
            <span
              className="h-2.5 w-5 shrink-0 rounded-sm"
              style={{
                background: item.dashed
                  ? `repeating-linear-gradient(90deg, ${item.colour} 0 4px, transparent 4px 7px)`
                  : item.colour,
              }}
            />
            {item.label}
          </li>
        ))}
      </ul>
      <p className="mt-2 font-medium text-slate-500">Inspection</p>
      <ul className="mt-1 space-y-1">
        {inspectionItems.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span
              className={`h-2.5 w-5 rounded-sm ${item.colour} ${item.faded ? "opacity-40" : ""}`}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
