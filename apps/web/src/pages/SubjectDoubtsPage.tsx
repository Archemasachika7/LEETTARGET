import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import type { Doubt, Subject } from "@leettarget/shared";
import { useUserData } from "../lib/userData.js";
import { getSubjectBySlug, isSubjectMember, joinSubject, listDoubts } from "../lib/doubts.js";
import { getErrorMessage } from "../lib/errors.js";
import { DoubtCard } from "../components/doubts/DoubtCard.js";
import { NewDoubtForm } from "../components/doubts/NewDoubtForm.js";
import { Button, Card, EmptyState, ErrorNote, SectionHeader, SkeletonRows, useToast } from "../ui/index.js";

export function SubjectDoubtsPage() {
  const { slug = "" } = useParams();
  const { userId } = useUserData();
  const [subject, setSubject] = useState<Subject | null>();
  const [member, setMember] = useState<boolean>();
  const [doubts, setDoubts] = useState<Doubt[]>();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string>();
  const [joining, setJoining] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setSubject(undefined);
    setMember(undefined);
    setDoubts(undefined);
    getSubjectBySlug(slug)
      .then((s) => {
        setSubject(s ?? null);
        if (!s) return;
        return isSubjectMember(userId, s.id).then((isMember) => {
          setMember(isMember);
          if (isMember) return listDoubts(s.id).then(setDoubts);
        });
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [slug, userId]);

  async function handleJoin() {
    if (!subject) return;
    setJoining(true);
    try {
      await joinSubject(userId, subject.id);
      setMember(true);
      const rows = await listDoubts(subject.id);
      setDoubts(rows);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setJoining(false);
    }
  }

  function handleDoubtCreated(doubt: Doubt) {
    setDoubts((cur) => [doubt, ...(cur ?? [])]);
    setShowForm(false);
    toast("Doubt posted");
  }

  function handleDoubtDeleted(id: string) {
    setDoubts((cur) => cur?.filter((d) => d.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/doubts" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-text-muted hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        All subjects
      </Link>

      {error && <ErrorNote>{error}</ErrorNote>}

      {subject === undefined ? (
        <SkeletonRows rows={3} />
      ) : subject === null ? (
        <EmptyState title="No subject by that name." description="Check the link, or go back and pick one from the list." />
      ) : member === false ? (
        <Card className="p-6 text-center">
          <h1 className="text-lg font-semibold text-text">{subject.name}</h1>
          <p className="mt-2 text-sm text-text-muted">Join to see its doubts and post your own.</p>
          <Button variant="primary" className="mt-4" onClick={handleJoin} loading={joining} loadingText="Joining…">
            Join {subject.name}
          </Button>
        </Card>
      ) : (
        <>
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-text">{subject.name}</h1>
              <p className="mt-1 text-sm text-text-muted">
                {doubts?.length ?? 0} doubt{doubts?.length === 1 ? "" : "s"} from everyone in this subject.
              </p>
            </div>
            <Button variant={showForm ? "ghost" : "primary"} size="sm" onClick={() => setShowForm((s) => !s)}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {showForm ? "Hide" : "Ask a doubt"}
            </Button>
          </header>

          {showForm && (
            <NewDoubtForm subjectId={subject.id} userId={userId} onCreated={handleDoubtCreated} onCancel={() => setShowForm(false)} />
          )}

          <section className="flex flex-col gap-3">
            <SectionHeader title="All doubts" />
            {!doubts ? (
              <SkeletonRows rows={4} />
            ) : doubts.length === 0 ? (
              <EmptyState title="Nothing posted yet." description="Be the first to ask something here." />
            ) : (
              doubts.map((doubt) => (
                <DoubtCard
                  key={doubt.id}
                  doubt={doubt}
                  subjectId={subject.id}
                  userId={userId}
                  canDelete={doubt.authorId === userId || subject.createdBy === userId}
                  onDeleted={() => handleDoubtDeleted(doubt.id)}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
