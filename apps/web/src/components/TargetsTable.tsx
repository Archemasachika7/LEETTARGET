import type { Target } from "@leettarget/shared";

interface Props {
  targets: Target[];
  onRemove?: (id: string) => void;
}

export function TargetsTable({ targets, onRemove }: Props) {
  if (targets.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No targets yet — add one or upload a CSV.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <th className="py-1.5 pr-2 font-medium">Question</th>
          <th className="py-1.5 pr-2 font-medium">Source</th>
          <th className="py-1.5 pr-2 font-medium">Status</th>
          {onRemove && <th className="py-1.5 font-medium" />}
        </tr>
      </thead>
      <tbody>
        {targets.map((target) => (
          <tr key={target.id} className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-1.5 pr-2 text-slate-900 dark:text-slate-100">
              {target.customUrl ? (
                <a
                  href={target.customUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {target.customTitle ?? target.customUrl}
                </a>
              ) : (
                target.customTitle ?? target.problemId
              )}
            </td>
            <td className="py-1.5 pr-2 text-slate-500 dark:text-slate-400">{target.source}</td>
            <td className="py-1.5 pr-2">
              <span
                className={
                  target.status === "done"
                    ? "rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                    : "rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }
              >
                {target.status}
              </span>
            </td>
            {onRemove && (
              <td className="py-1.5 text-right">
                <button
                  onClick={() => onRemove(target.id)}
                  className="text-xs text-slate-400 transition-colors duration-200 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                  aria-label={`Remove ${target.customTitle ?? "target"}`}
                >
                  Remove
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
