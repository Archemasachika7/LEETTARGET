import type { SourceGroup } from "../../lib/zone/sources.js";

export function SourcesPanel({ groups }: { groups: SourceGroup[] }) {
  return (
    <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
      {groups.map((group) => (
        <section key={group.name} className={group.name === "Start here" ? "md:col-span-2" : undefined}>
          <h3 className="mb-1 font-plex text-[10px] uppercase tracking-[0.14em] text-z-faint">{group.name}</h3>
          <ul className={group.name === "Start here" ? "grid gap-x-10 md:grid-cols-2" : undefined}>
            {group.sources.map((s) => (
              <li key={s.title} className="border-b border-z-ink/10 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[15px] font-medium text-z-ink underline decoration-z-ink/20 underline-offset-[3px] transition-colors hover:text-z-accent hover:decoration-z-accent"
                    >
                      {s.title} <span aria-hidden className="text-z-faint">↗</span>
                    </a>
                  ) : (
                    <span className="text-[15px] font-medium text-z-ink">{s.title}</span>
                  )}
                  <span className="shrink-0 font-plex text-[10px] uppercase tracking-[0.12em] text-z-muted">
                    {s.kind}
                    {s.free ? <span className="text-z-accent"> · free</span> : ""}
                  </span>
                </div>
                {s.by && <p className="font-plex text-[11px] text-z-muted">{s.by}</p>}
                <p className="mt-1 text-[14px] leading-[1.45] text-z-muted">{s.why}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
