import type { PdsaVizId } from "@leettarget/shared";
import { SortingViz } from "./SortingViz.js";
import { SearchViz } from "./SearchViz.js";
import { HashViz } from "./HashViz.js";
import { BstViz } from "./BstViz.js";
import { GraphViz } from "./GraphViz.js";
import { LinearViz } from "./LinearViz.js";
import { cn } from "../../../lib/cn.js";

export const VIZ_TABS: { id: PdsaVizId; label: string; syllabus: string }[] = [
  { id: "sorting", label: "Sorting", syllabus: "Selection, bubble, insertion; mergesort, quicksort" },
  { id: "searching", label: "Searching", syllabus: "Linear search and binary search" },
  { id: "linear", label: "Stacks, queues, lists", syllabus: "Stacks, queues, linked lists" },
  { id: "hashing", label: "Hash tables", syllabus: "Hash tables" },
  { id: "bst", label: "Trees", syllabus: "Trees" },
  { id: "graphs", label: "Graphs", syllabus: "Traversals and shortest path" },
];

export function PdsaLab({ active, onChange }: { active: PdsaVizId; onChange: (id: PdsaVizId) => void }) {
  const tab = VIZ_TABS.find((t) => t.id === active)!;
  return (
    <div className="border border-z-ink/20 bg-z-raised">
      <div className="flex overflow-x-auto border-b border-z-ink/20" role="tablist" aria-label="Visualisers">
        {VIZ_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-3 font-plex text-[11px] uppercase tracking-[0.12em] transition-colors",
              active === t.id ? "border-z-accent text-z-ink" : "border-transparent text-z-muted hover:text-z-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4 sm:p-6" role="tabpanel">
        <p className="mb-5 font-plex text-[10px] uppercase tracking-[0.14em] text-z-faint">Syllabus: {tab.syllabus}</p>
        {active === "sorting" && <SortingViz />}
        {active === "searching" && <SearchViz />}
        {active === "linear" && <LinearViz />}
        {active === "hashing" && <HashViz />}
        {active === "bst" && <BstViz />}
        {active === "graphs" && <GraphViz />}
      </div>
    </div>
  );
}
