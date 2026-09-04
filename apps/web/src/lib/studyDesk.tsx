import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { StudyAttachmentMeta } from "./studyDeskAttachments.js";

export type StudyTrack = "leetcode" | "gate" | "cat";
export type StuckItemStatus = "stuck" | "revisit" | "cleared";

export interface StudyTrackInfo {
  id: StudyTrack;
  label: string;
  shortLabel: string;
  kicker: string;
  description: string;
  deskTitle: string;
  capturePrompt: string;
  subjects: string[];
}

export interface StuckItem {
  id: string;
  track: Exclude<StudyTrack, "leetcode">;
  title: string;
  subject: string;
  note?: string;
  /** An optional final answer or key result, kept separate from the reflection. */
  answer?: string;
  /** An optional method, approach, or re-entry cue for the next attempt. */
  method?: string;
  /** Local attachment metadata. File bodies live in IndexedDB, not localStorage. */
  attachments?: StudyAttachmentMeta[];
  status: StuckItemStatus;
  createdAt: string;
}

export const STUDY_TRACKS: Record<StudyTrack, StudyTrackInfo> = {
  leetcode: {
    id: "leetcode",
    label: "LeetCode",
    shortLabel: "LC",
    kicker: "Code practice",
    description: "Targets, sessions, topics and a clean trail back to the code you ship.",
    deskTitle: "Practice queue",
    capturePrompt: "Keep one clear target in front of you.",
    subjects: ["Algorithms", "Data structures", "System design", "Other"],
  },
  gate: {
    id: "gate",
    label: "GATE",
    shortLabel: "GATE",
    kicker: "Exam preparation",
    description: "A deliberate revision desk for concepts and questions that need a second pass.",
    deskTitle: "GATE stuck desk",
    capturePrompt: "Capture the question before its weak spot disappears from memory.",
    subjects: ["Engineering mathematics", "Core subject", "Aptitude", "Previous-year question", "Other"],
  },
  cat: {
    id: "cat",
    label: "CAT",
    shortLabel: "CAT",
    kicker: "MBA entrance",
    description: "A light but structured place to return to difficult sets, methods and timing mistakes.",
    deskTitle: "CAT stuck desk",
    capturePrompt: "Save the set, the method you missed, and the cue for your next attempt.",
    subjects: ["Quantitative aptitude", "DILR", "VARC", "Mock analysis", "Other"],
  },
};

interface SavedDesk {
  mode?: StudyTrack;
  items?: StuckItem[];
}

interface StudyDeskContextValue {
  mode: StudyTrack;
  track: StudyTrackInfo;
  stuckItems: StuckItem[];
  setMode: (mode: StudyTrack) => void;
  addStuckItem: (item: Omit<StuckItem, "id" | "createdAt" | "status">) => string;
  /** Adds only backup entries whose IDs are not already on this device. */
  mergeStuckItems: (items: StuckItem[]) => { added: number; skipped: number; addedIds: string[] };
  setStuckItemAttachments: (id: string, attachments: StudyAttachmentMeta[]) => void;
  setStuckItemStatus: (id: string, status: StuckItemStatus) => void;
  removeStuckItem: (id: string) => void;
}

const StudyDeskContext = createContext<StudyDeskContextValue | undefined>(undefined);

/** Keeps its pre-rename value on purpose. This key is where every existing
 * learner's GATE/CAT desk already lives on their device; renaming it would
 * silently empty the desk for everyone who had one, to change a string no user
 * ever sees. Same reasoning as the IndexedDB name in studyDeskAttachments.ts,
 * where the cost would be orphaning saved attachment files. */
function storageKey(userId: string) {
  return `leettarget-study-desk:${userId}`;
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * GATE and CAT questions are intentionally stored apart from the LeetCode
 * target schema: they are free-form revision material, not canonical coding
 * problems. Local persistence lets the feature work immediately for every
 * signed-in learner without changing existing sync, imports or repo mapping.
 */
export function StudyDeskProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [mode, setModeState] = useState<StudyTrack>("leetcode");
  const [stuckItems, setStuckItems] = useState<StuckItem[]>([]);
  const stuckItemsRef = useRef<StuckItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId));
      if (saved) {
        const parsed = JSON.parse(saved) as SavedDesk;
        if (parsed.mode && parsed.mode in STUDY_TRACKS) setModeState(parsed.mode);
        if (Array.isArray(parsed.items)) {
          stuckItemsRef.current = parsed.items;
          setStuckItems(parsed.items);
        }
      }
    } catch {
      // A bad local value should never prevent the study workspace from loading.
    } finally {
      setHydrated(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey(userId), JSON.stringify({ mode, items: stuckItems } satisfies SavedDesk));
  }, [hydrated, mode, stuckItems, userId]);

  const setMode = useCallback((nextMode: StudyTrack) => setModeState(nextMode), []);

  const addStuckItem = useCallback((item: Omit<StuckItem, "id" | "createdAt" | "status">) => {
    const id = createId();
    setStuckItems((current) => {
      const next: StuckItem[] = [{ ...item, id, createdAt: new Date().toISOString(), status: "stuck" }, ...current];
      stuckItemsRef.current = next;
      return next;
    });
    return id;
  }, []);

  const mergeStuckItems = useCallback((imported: StuckItem[]) => {
    const current = stuckItemsRef.current;
    const existingIds = new Set(current.map((item) => item.id));
    const additions = imported.filter((item) => !existingIds.has(item.id));
    if (additions.length > 0) {
      const next = [...additions, ...current];
      stuckItemsRef.current = next;
      setStuckItems(next);
    }
    return { added: additions.length, skipped: imported.length - additions.length, addedIds: additions.map((item) => item.id) };
  }, []);

  const setStuckItemAttachments = useCallback((id: string, attachments: StudyAttachmentMeta[]) => {
    setStuckItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, attachments } : item));
      stuckItemsRef.current = next;
      return next;
    });
  }, []);

  const setStuckItemStatus = useCallback((id: string, status: StuckItemStatus) => {
    setStuckItems((current) => {
      const next = current.map((item) => (item.id === id ? { ...item, status } : item));
      stuckItemsRef.current = next;
      return next;
    });
  }, []);

  const removeStuckItem = useCallback((id: string) => {
    setStuckItems((current) => {
      const next = current.filter((item) => item.id !== id);
      stuckItemsRef.current = next;
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      mode,
      track: STUDY_TRACKS[mode],
      stuckItems,
      setMode,
      addStuckItem,
      mergeStuckItems,
      setStuckItemAttachments,
      setStuckItemStatus,
      removeStuckItem,
    }),
    [mode, stuckItems, setMode, addStuckItem, mergeStuckItems, setStuckItemAttachments, setStuckItemStatus, removeStuckItem]
  );

  return <StudyDeskContext.Provider value={value}>{children}</StudyDeskContext.Provider>;
}

export function useStudyDesk() {
  const context = useContext(StudyDeskContext);
  if (!context) throw new Error("useStudyDesk must be used inside StudyDeskProvider.");
  return context;
}
