import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import type { UserGoals } from "@leettarget/shared";
import { useUserData } from "../../lib/userData.js";
import { useStudyDesk } from "../../lib/studyDesk.js";
import { useTopics } from "../../lib/useTopics.js";
import { getUserGoals } from "../../lib/api.js";
import { buildContextSummary } from "../../lib/assistant/context.js";
import { askAssistant, assistantEnabled, type ChatTurn } from "../../lib/assistant/chat.js";
import { splineSceneUrl, SplineAvatar } from "./SplineAvatar.js";
import { Button, Card } from "../../ui/index.js";
import { cn } from "../../lib/cn.js";

const GREETING =
  "Ask me about your streak, your targets, or where you're stuck. I only know what's in your own LeetTarget data.";

/** A floating chat widget, present on every signed-in page, that answers
 * questions about the reader's own progress — never anyone else's, and
 * never a number LeetTarget doesn't actually track. See
 * lib/assistant/context.ts for exactly what data it's given. */
export function AssistantWidget() {
  const { userId, targets, solved, refreshTick } = useUserData();
  const { mode, stuckItems } = useStudyDesk();
  const { focus } = useTopics(userId, refreshTick);
  const [goals, setGoals] = useState<UserGoals>();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const enabled = assistantEnabled();
  const sceneUrl = splineSceneUrl();

  useEffect(() => {
    if (mode !== "leetcode") return;
    getUserGoals(userId)
      .then(setGoals)
      .catch(() => {});
  }, [userId, mode, refreshTick]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns, busy]);

  async function handleSend() {
    const text = input.trim();
    if (!text || busy || !enabled) return;
    const next: ChatTurn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setInput("");
    setBusy(true);
    const summary = buildContextSummary({ track: mode, targets, solved, goals, focusTopics: focus, stuckItems });
    const reply = await askAssistant(next, summary);
    setTurns((cur) => [
      ...cur,
      { role: "assistant", content: reply ?? "Couldn't reach the model just now — try again in a moment." },
    ]);
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-brand text-brand-contrast shadow-[0_8px_24px_rgb(0_0_0_/_0.18)] transition-transform duration-fast hover:scale-105 sm:right-6 md:bottom-5"
      >
        {sceneUrl ? <SplineAvatar url={sceneUrl} className="h-full w-full" /> : <Bot className="h-6 w-6" aria-hidden />}
      </button>

      {open && (
        <Card className="animate-enter fixed bottom-[9.5rem] right-4 z-50 flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden sm:right-6 md:bottom-24">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-brand" aria-hidden />
              <span className="text-sm font-semibold text-text">Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-sm p-1 text-text-muted transition-colors duration-fast hover:bg-surface hover:text-text"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <p className="text-[13px] text-text-muted">{GREETING}</p>
            {turns.map((turn, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-sm px-3 py-2 text-[13px] leading-relaxed",
                  turn.role === "user" ? "ml-auto bg-brand text-brand-contrast" : "bg-surface text-text"
                )}
              >
                {turn.content}
              </div>
            ))}
            {busy && (
              <div className="max-w-[85%] rounded-sm bg-surface px-3 py-2 text-[13px] text-text-muted">Thinking…</div>
            )}
          </div>

          <div className="border-t border-border p-3">
            {enabled ? (
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about your progress…"
                  rows={1}
                  className="h-9 max-h-24 flex-1 resize-none rounded-sm border border-border bg-elevated px-2.5 py-2 text-[13px] text-text placeholder:text-text-muted transition-colors duration-fast hover:border-border-strong focus:border-brand focus:outline-none"
                />
                <Button type="button" size="sm" variant="primary" onClick={handleSend} disabled={!input.trim() || busy} aria-label="Send">
                  <Send className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            ) : (
              <p className="text-[12px] text-text-muted">
                Add <code className="font-mono text-text-secondary">VITE_GROQ_API_KEY</code> to enable the assistant —
                a free key is available at console.groq.com.
              </p>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
