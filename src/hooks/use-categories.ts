import { useCallback, useState } from "react";
import { loadSelectedCategories, saveSelectedCategories } from "@/lib/categories";

export function useCategories() {
  // Initialize synchronously from localStorage to avoid a race condition where
  // the queue-build effect in index.tsx runs with an empty category selection
  // before the real saved selection loads, which would mismatch the queue-cache's
  // stored categoriesHash and cause unnecessary cache invalidation.
  const [selected, setSelected] = useState<string[]>(() => loadSelectedCategories());

  const update = useCallback((next: string[]) => {
    setSelected(next);
    saveSelectedCategories(next);
  }, []);

  const toggle = useCallback(
    (id: string) =>
      update(
        selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
      ),
    [selected, update],
  );

  const clear = useCallback(() => update([]), [update]);

  return { selected, toggle, clear };
}
