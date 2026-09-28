import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { slugifySubject, type Doubt, type Subject } from "@leettarget/shared";
import { findOrCreateSubject, getSubjectBySlug, isSubjectMember, joinSubject, listDoubts } from "../../lib/doubts.js";
import { getErrorMessage } from "../../lib/errors.js";
import { ErrorLine, ZButton } from "./primitives.js";

/** The zone's window onto the doubts forum. Doubts already live there, shared
 * per subject with screenshots and hidden answers, so the zone links to one
 * subject rather than keeping a second, separate pile of questions. */
export function DoubtsPanel({ userId, subjectName }: { userId: string; subjectName: string }) {
  const slug = slugifySubject(subjectName);
  const [subject, setSubject] = useState<Subject | null>();
  const [member, setMember] = useState(false);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      const s = await getSubjectBySlug(slug);
      setSubject(s ?? null);
      if (!s) return;
      const joined = await isSubjectMember(userId, s.id);
      setMember(joined);
      if (joined) setDoubts((await listDoubts(s.id)).slice(0, 6));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [slug, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function join() {
    setBusy(true);
    try {
      const s = subject ?? (await findOrCreateSubject(userId, subjectName));
      await joinSubject(userId, s.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (subject === undefined && !error) return <p className="font-plex text-sm text-z-muted">Loading…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex flex-col gap-3 self-start">
        <p className="text-[15px] leading-6 text-z-muted">
          Doubts go to the <span className="text-z-ink">{subjectName}</span> subject in Waypoint's forum. Everyone who
          joins it can see the question, add screenshots, and post an answer that stays hidden until you want it.
        </p>
        {member ? (
          <Link
            to={`/doubts/${slug}`}
            className="inline-flex h-9 w-fit items-center bg-z-ink px-3 font-plex text-[11px] uppercase tracking-[0.12em] text-z-bg hover:bg-z-accent"
          >
            Ask or answer →
          </Link>
        ) : (
          <ZButton variant="solid" onClick={join} disabled={busy} className="w-fit">
            {busy ? "Joining…" : subject ? `Join ${subjectName}` : `Start the ${subjectName} subject`}
          </ZButton>
        )}
        {error && <ErrorLine>{error}</ErrorLine>}
      </div>

      <div>
        {!member ? (
          <p className="text-[15px] leading-6 text-z-muted">Join to see what others are stuck on.</p>
        ) : doubts.length === 0 ? (
          <p className="text-[15px] leading-6 text-z-muted">No doubts posted yet.</p>
        ) : (
          <ul className="flex flex-col">
            {doubts.map((d) => (
              <li key={d.id} className="flex items-baseline gap-4 border-b border-z-ink/10 py-2.5">
                <span className={d.status === "resolved" ? "h-2 w-2 shrink-0 bg-z-accent" : "h-2 w-2 shrink-0 border border-z-ink/50"} aria-hidden />
                <Link to={`/doubts/${slug}`} className="min-w-0 flex-1 truncate text-[15px] text-z-ink hover:text-z-accent">
                  {d.title}
                </Link>
                <span className="shrink-0 font-plex text-[11px] text-z-muted">{d.status === "resolved" ? "Answered" : "Open"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
