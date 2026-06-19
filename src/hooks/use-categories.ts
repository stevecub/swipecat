import { useCallback, useEffect, useState } from "react";
import { loadSelectedCategories, saveSelectedCategories } from "@/lib/categories";

export function useCategories() {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setSelected(loadSelectedCategories());
  }, []);

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
