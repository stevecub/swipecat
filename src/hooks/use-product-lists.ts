import { useCallback, useEffect, useState } from "react";

type Lists = {
  liked: string[];
  passed: string[];
};

const KEY = "swipeshop:lists:v2";

function load(): Lists {
  if (typeof window === "undefined") return { liked: [], passed: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { liked: [], passed: [] };
    const parsed = JSON.parse(raw) as Partial<Lists>;
    return { liked: parsed.liked ?? [], passed: parsed.passed ?? [] };
  } catch {
    return { liked: [], passed: [] };
  }
}

function persist(lists: Lists) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(lists));
}

export function useProductLists() {
  const [lists, setLists] = useState<Lists>(() => load());

  // Also load on mount to catch any hydration mismatch
  useEffect(() => {
    setLists(load());
  }, []);

  const update = useCallback((updater: (prev: Lists) => Lists) => {
    setLists((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const like = useCallback(
    (id: string) =>
      update((p) => ({
        liked: p.liked.includes(id) ? p.liked : [id, ...p.liked],
        passed: p.passed.filter((x) => x !== id),
      })),
    [update],
  );

  const pass = useCallback(
    (id: string) =>
      update((p) => ({
        passed: p.passed.includes(id) ? p.passed : [id, ...p.passed],
        liked: p.liked.filter((x) => x !== id),
      })),
    [update],
  );

  const remove = useCallback(
    (id: string) =>
      update((p) => ({
        liked: p.liked.filter((x) => x !== id),
        passed: p.passed.filter((x) => x !== id),
      })),
    [update],
  );

  const clearLiked = useCallback(
    () => update((p) => ({ ...p, liked: [] })),
    [update],
  );

  const clearPassed = useCallback(
    () => update((p) => ({ ...p, passed: [] })),
    [update],
  );

  return { lists, like, pass, remove, clearLiked, clearPassed };
}
