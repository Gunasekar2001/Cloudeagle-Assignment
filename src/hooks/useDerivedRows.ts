import { useMemo } from "react";
import type { Employee } from "../types";
import { COLUMNS } from "../data/columns";
import { filterRows, sortRows, searchRows } from "../utils/sortFilter";
import { useTable } from "../state/TableContext";

/**
 * Compute the rows actually shown, as a 3-stage pipeline:
 *
 *     rows  ──►  global search  ──►  per-column filters  ──►  multi-column sort
 *
 * The result is memoised on exactly the inputs that affect it (`rows`,
 * `search`, `filters`, `sortRules`). Crucially it does NOT depend on `drafts`,
 * so typing inside an open editor never re-runs this pass over 10k rows — that
 * is what keeps editing snappy on a large dataset.
 */
export function useDerivedRows(): Employee[] {
  const { state } = useTable();
  const { rows, search, filters, sortRules } = state;

  return useMemo(() => {
    const searched = searchRows(rows, search, COLUMNS);
    const filtered = filterRows(searched, filters, COLUMNS);
    return sortRows(filtered, sortRules);
  }, [rows, search, filters, sortRules]);
}
