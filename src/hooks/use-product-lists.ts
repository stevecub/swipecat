import { useCallback, useEffect, useState } from "react";

type Lists = {
  liked: string[];
  saved: string[];
  passed: string[];
};

const KEY = "swipeshop:lists:v1";

function load(): Lists {
  if (typeof window === "undefined") return { liked: [], saved: [], passed: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { liked: [], saved: [], passed: [] };
    return JSON.parse(raw) as Lists;
  } catch {
    return { liked: [], saved: [], passed: [] };
  }
}

function save(lists: Lists) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(lists));
}

export function useProductLists() {
  const [lists, setLists] = useState<Lists>({ liked: [], saved: [], passed: [] });

  useEffect(() => {
    setLists(load());
  }, []);

  const update = useCallback((updater: (prev: Lists) => Lists) => {
    setLists((prev) => {
      const next = updater(prev);
      save(next);
      return next;
    });
  }, []);

  const like = useCallback(
    (id: string) =>
      update((p) => ({
        ...p,
        liked: p.liked.includes(id) ? p.liked : [id, ...p.liked],
        passed: p.passed.filter((x) => x !== id),
      })),
    [update],
  );

  const saveItem = useCallback(
    (id: string) =>
      update((p) => ({
        ...p,
        saved: p.saved.includes(id) ? p.saved : [id, ...p.saved],
      })),
    [update],
  );

  const pass = useCallback(
    (id: string) =>
      update((p) => ({
        ...p,
        passed: p.passed.includes(id) ? p.passed : [id, ...p.passed],
        liked: p.liked.filter((x) => x !== id),
      })),
    [update],
  );

  const remove = useCallback(
    (id: string) =>
      update((p) => ({
        liked: p.liked.filter((x) => x !== id),
        saved: p.saved.filter((x) => x !== id),
        passed: p.passed.filter((x) => x !== id),
      })),
    [update],
  );

  return { lists, like, save: saveItem, pass, remove };
}
