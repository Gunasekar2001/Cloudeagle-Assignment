import { useMemo } from "react";
import type { Employee } from "../types";
import { COLUMNS } from "../data/columns";
import { filterRows, sortRows } from "../utils/sortFilter";
import { useTable } from "../state/TableContext";

/**
 * Compute the filtered + sorted view of the data.
 * Memoised on the inputs that actually affect the result, so typing into an
 * open row editor (which only touches `drafts`) does NOT trigger a re-derive.
 */
export function useDerivedRows(): Employee[] {
  const { state } = useTable();
  const { rows, filters, sortRules } = state;

  return useMemo(() => {
    const filtered = filterRows(rows, filters, COLUMNS);
    return sortRows(filtered, sortRules);
  }, [rows, filters, sortRules]);
}
