import { useEffect, useRef } from "react";
import type { Employee, ColumnDef } from "../types";
import { useTable } from "../state/TableContext";

interface Props {
  columns: ColumnDef[];
  gridTemplate: string;
  showFilters: boolean;
  /** True when every row in the current view is selected. */
  allSelected: boolean;
  /** True when some (but not all) rows in the current view are selected. */
  someSelected: boolean;
  onToggleSelectAll: () => void;
}

export function TableHead({
  columns,
  gridTemplate,
  showFilters,
  allSelected,
  someSelected,
  onToggleSelectAll,
}: Props) {
  const { state, dispatch } = useTable();
  const { sortRules, filters } = state;

  // Drive the "indeterminate" checkbox state (can't be set via JSX prop).
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const sortInfo = (key: keyof Employee) => {
    const idx = sortRules.findIndex((r) => r.key === key);
    if (idx === -1) return { arrow: "", order: 0 };
    return {
      arrow: sortRules[idx].direction === "asc" ? "↑" : "↓",
      order: sortRules.length > 1 ? idx + 1 : 0, // show precedence only in multi-sort
    };
  };

  return (
    <div className="thead" role="rowgroup">
      {/* Header row */}
      <div className="tr th-row" role="row" style={{ gridTemplateColumns: gridTemplate }}>
        <div className="th th-check" role="columnheader">
          <input
            ref={selectAllRef}
            type="checkbox"
            aria-label="Select all rows in view"
            checked={allSelected}
            onChange={onToggleSelectAll}
          />
        </div>

        {columns.map((col) => {
          const { arrow, order } = sortInfo(col.key);
          return (
            <button
              key={col.key}
              role="columnheader"
              className="th th-sortable"
              style={{ justifyContent: col.align === "right" ? "flex-end" : "flex-start" }}
              title="Click to sort · Shift-click to add to a multi-column sort"
              onClick={(e) => dispatch({ type: "TOGGLE_SORT", key: col.key, additive: e.shiftKey })}
            >
              <span>{col.label}</span>
              {arrow && <span className="sort-arrow">{arrow}</span>}
              {order > 0 && <span className="sort-order">{order}</span>}
            </button>
          );
        })}

        <div className="th th-actions" role="columnheader">
          Actions
        </div>
      </div>

      {/* Optional per-column filter row */}
      {showFilters && (
        <div className="tr filter-row" role="row" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="th filter-cell" role="cell" />
          {columns.map((col) => (
            <div className="th filter-cell" key={col.key} role="cell">
              <input
                className="filter-input"
                placeholder={col.type === "number" ? ">0 · 10-20" : "Filter…"}
                aria-label={`Filter ${col.label}`}
                value={filters[col.key] ?? ""}
                onChange={(e) =>
                  dispatch({ type: "SET_FILTER", key: col.key, value: e.target.value })
                }
              />
            </div>
          ))}
          <div className="th filter-cell" role="cell" />
        </div>
      )}
    </div>
  );
}
