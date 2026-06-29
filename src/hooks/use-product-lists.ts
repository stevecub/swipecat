import { useCallback, useEffect, useRef, useState } from "react";
import { nativeGet, nativeSet } from "@/lib/native-storage";

type Lists = {
  liked: string[];
  passed: string[];
};

const KEY = "swipeshop:lists:v2";

/**
 * Manages the liked/passed product lists with native persistent storage.
 *
 * On iOS, data is stored in native UserDefaults via @capacitor/preferences,
 * ensuring it survives app restarts and WKWebView storage pressure.
 * On web, falls back to localStorage.
 */
export function useProductLists() {
  const [lists, setLists] = useState<Lists>({ liked: [], passed: [] });
  const [loaded, setLoaded] = useState(false);
  const persistQueue = useRef<Lists | null>(null);
  const persisting = useRef(false);

  // Load from native storage on mount
  useEffect(() => {
    nativeGet(KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<Lists>;
          setLists({ liked: parsed.liked ?? [], passed: parsed.passed ?? [] });
        } catch {
          // corrupted data — start fresh
        }
      }
      setLoaded(true);
    });
  }, []);

  // Persist helper — queues writes to avoid race conditions with async storage
  const persist = useCallback((data: Lists) => {
    persistQueue.current = data;
    if (persisting.current) return;
    persisting.current = true;

    const flush = async () => {
      while (persistQueue.current !== null) {
        const toWrite = persistQueue.current;
        persistQueue.current = null;
        await nativeSet(KEY, JSON.stringify(toWrite));
      }
      persisting.current = false;
    };

    void flush();
  }, []);

  const update = useCallback(
    (updater: (prev: Lists) => Lists) => {
      setLists((prev) => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

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

  return { lists, like, pass, remove, loaded };
}
