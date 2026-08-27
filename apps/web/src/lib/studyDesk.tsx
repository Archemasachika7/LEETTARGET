import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
  addStuckItem: (item: Omit<StuckItem, "id" | "createdAt" | "status">) => void;
  setStuckItemStatus: (id: string, status: StuckItemStatus) => void;
  removeStuckItem: (id: string) => void;
}

const StudyDeskContext = createContext<StudyDeskContextValue | undefined>(undefined);

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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId));
      if (saved) {
        const parsed = JSON.parse(saved) as SavedDesk;
        if (parsed.mode && parsed.mode in STUDY_TRACKS) setModeState(parsed.mode);
        if (Array.isArray(parsed.items)) setStuckItems(parsed.items);
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
    setStuckItems((current) => [
      { ...item, id: createId(), createdAt: new Date().toISOString(), status: "stuck" },
      ...current,
    ]);
  }, []);

  const setStuckItemStatus = useCallback((id: string, status: StuckItemStatus) => {
    setStuckItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  }, []);

  const removeStuckItem = useCallback((id: string) => {
    setStuckItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      mode,
      track: STUDY_TRACKS[mode],
      stuckItems,
      setMode,
      addStuckItem,
      setStuckItemStatus,
      removeStuckItem,
    }),
    [mode, stuckItems, setMode, addStuckItem, setStuckItemStatus, removeStuckItem]
  );

  return <StudyDeskContext.Provider value={value}>{children}</StudyDeskContext.Provider>;
}

export function useStudyDesk() {
  const context = useContext(StudyDeskContext);
  if (!context) throw new Error("useStudyDesk must be used inside StudyDeskProvider.");
  return context;
}
