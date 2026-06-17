import type { Employee } from "../types";
import { COLUMNS } from "../data/columns";
import { useTable } from "../state/TableContext";

interface Props {
  gridTemplate: string;
  showFilters: boolean;
}

export function TableHead({ gridTemplate, showFilters }: Props) {
  const { state, dispatch } = useTable();
  const { sortRules, filters } = state;

  const sortInfo = (key: keyof Employee) => {
    const idx = sortRules.findIndex((r) => r.key === key);
    if (idx === -1) return { arrow: "", order: 0 };
    return {
      arrow: sortRules[idx].direction === "asc" ? "▲" : "▼",
      order: sortRules.length > 1 ? idx + 1 : 0,
    };
  };

  return (
    <div className="thead" role="rowgroup">
      <div className="tr th-row" role="row" style={{ gridTemplateColumns: gridTemplate }}>
        {COLUMNS.map((col) => {
          const { arrow, order } = sortInfo(col.key);
          return (
            <button
              key={col.key}
              role="columnheader"
              className="th"
              style={{ justifyContent: col.align === "right" ? "flex-end" : "flex-start" }}
              title="Click to sort. Shift-click to add to a multi-column sort."
              onClick={(e) =>
                dispatch({ type: "TOGGLE_SORT", key: col.key, additive: e.shiftKey })
              }
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

      {showFilters && (
        <div
          className="tr filter-row"
          role="row"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {COLUMNS.map((col) => (
            <div className="th filter-cell" key={col.key} role="cell">
              <input
                className="filter-input"
                placeholder={col.type === "number" ? ">0, 10-20…" : "Filter…"}
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
