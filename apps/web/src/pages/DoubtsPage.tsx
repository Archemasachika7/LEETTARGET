import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircleQuestion, Plus, Users } from "lucide-react";
import type { Subject } from "@leettarget/shared";
import { useUserData } from "../lib/userData.js";
import { findOrCreateSubject, joinSubject, listMySubjects, listSubjects } from "../lib/doubts.js";
import { getErrorMessage } from "../lib/errors.js";
import { Button, Card, EmptyState, ErrorNote, Field, Input, SectionHeader, SkeletonRows, useToast } from "../ui/index.js";

/** The forum's front door: subjects you're already in, and everything else
 * you could join or start. A subject is anything a user names — PDSA,
 * GATE, CAT, or a one-off study group — there's no curated list (see
 * migration 0008_doubts.sql for why creation is intentionally open). */
export function DoubtsPage() {
  const { userId } = useUserData();
  const [mine, setMine] = useState<Subject[]>();
  const [all, setAll] = useState<Subject[]>();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  function refresh() {
    Promise.all([listMySubjects(userId), listSubjects()])
      .then(([m, a]) => {
        setMine(m);
        setAll(a);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }

  useEffect(refresh, [userId]);

  async function handleCreate() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const subject = await findOrCreateSubject(userId, name.trim());
      await joinSubject(userId, subject.id);
      setName("");
      refresh();
      toast(`Joined ${subject.name}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(subject: Subject) {
    try {
      await joinSubject(userId, subject.id);
      refresh();
      toast(`Joined ${subject.name}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const mineIds = new Set((mine ?? []).map((s) => s.id));
  const browseable = (all ?? []).filter((s) => !mineIds.has(s.id));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-text">Doubts</h1>
        <p className="mt-1 text-sm text-text-muted">
          Questions and their solutions, kept where the people studying the same thing can find them.
        </p>
      </header>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Card className="flex flex-col gap-3 p-4">
        <SectionHeader
          title="Start or join a subject"
          description={'Type a name — "PDSA", a course code, a team name — existing subjects are matched automatically.'}
          icon={<Plus className="h-4 w-4 text-text-muted" aria-hidden />}
        />
        <div className="flex gap-2">
          <Field label="Subject name" className="flex-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="PDSA"
            />
          </Field>
          <Button variant="primary" onClick={handleCreate} disabled={!name.trim()} loading={busy} loadingText="Joining…" className="self-end">
            Go
          </Button>
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Your subjects" icon={<MessageCircleQuestion className="h-4 w-4 text-text-muted" aria-hidden />} />
        {!mine ? (
          <SkeletonRows rows={2} />
        ) : mine.length === 0 ? (
          <EmptyState title="No subjects yet." description="Create or join one above to see its doubts." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((subject) => (
              <Link key={subject.id} to={`/doubts/${subject.slug}`}>
                <Card interactive className="flex items-center justify-between p-4">
                  <span className="font-medium text-text">{subject.name}</span>
                  <ArrowRight className="h-4 w-4 text-text-muted" aria-hidden />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {browseable.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title="Other subjects" icon={<Users className="h-4 w-4 text-text-muted" aria-hidden />} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {browseable.map((subject) => (
              <Card key={subject.id} className="flex items-center justify-between p-4">
                <span className="text-text">{subject.name}</span>
                <Button size="sm" variant="secondary" onClick={() => handleJoin(subject)}>
                  Join
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
