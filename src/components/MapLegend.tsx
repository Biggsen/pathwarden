import type { PathStatus } from "../domain/inspection";

const items: { status: PathStatus; label: string; colour: string }[] = [
  { status: "not_inspected", label: "Not inspected", colour: "bg-slate-500" },
  { status: "inspected", label: "Inspected", colour: "bg-green-600" },
  { status: "issue", label: "Issue", colour: "bg-amber-500" },
];

export default function MapLegend() {
  return (
    <ul className="pointer-events-none absolute left-3 top-3 z-10 space-y-1 rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-700 shadow">
      {items.map((item) => (
        <li key={item.status} className="flex items-center gap-2">
          <span className={`h-2.5 w-5 rounded-sm ${item.colour}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
