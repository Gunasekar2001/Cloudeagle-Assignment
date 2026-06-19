import type { ColumnDef, SortDirection } from "../types";
import { useTable } from "../state/TableContext";

interface Props {
  columns: ColumnDef[];
  allSelected: boolean;
  onToggleSelectAll: () => void;
}

/**
 * Compact controls shown instead of the column header on phones, where a wide
 * sortable header row doesn't fit. Provides a "sort by" select + direction
 * toggle (mapped to SET_SINGLE_SORT) and a select-all-in-view checkbox.
 */
export function MobileControls({ columns, allSelected, onToggleSelectAll }: Props) {
  const { state, dispatch } = useTable();
  const active = state.sortRules[0];

  const setSortKey = (key: string) => {
    dispatch({
      type: "SET_SINGLE_SORT",
      key: key ? (key as ColumnDef["key"]) : null,
      direction: active?.direction ?? "asc",
    });
  };
  const flipDir = () => {
    if (!active) return;
    const direction: SortDirection = active.direction === "asc" ? "desc" : "asc";
    dispatch({ type: "SET_SINGLE_SORT", key: active.key, direction });
  };

  return (
    <div className="mobile-controls">
      <label className="mc-selectall">
        <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} />
        <span>All</span>
      </label>

      <div className="mc-sort">
        <span className="muted">Sort</span>
        <select
          className="page-size"
          aria-label="Sort by column"
          value={active?.key ?? ""}
          onChange={(e) => setSortKey(e.target.value)}
        >
          <option value="">None</option>
          {columns.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          className="btn btn-sm"
          disabled={!active}
          onClick={flipDir}
          aria-label="Toggle sort direction"
          title="Toggle ascending / descending"
        >
          {active ? (active.direction === "asc" ? "↑ Asc" : "↓ Desc") : "—"}
        </button>
      </div>
    </div>
  );
}
