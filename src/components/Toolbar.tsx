import type { Employee } from "../types";
import { COLUMNS } from "../data/columns";
import { useTable } from "../state/TableContext";
import { toCsv, downloadCsv } from "../utils/csv";

interface Props {
  derivedRows: Employee[];
  totalRows: number;
  showFilters: boolean;
  onToggleFilters: () => void;
  openEdits: number;
  modifiedCount: number;
}

export function Toolbar({
  derivedRows,
  totalRows,
  showFilters,
  onToggleFilters,
  openEdits,
  modifiedCount,
}: Props) {
  const { state, dispatch } = useTable();
  const { viewMode, filters } = state;
  const hasFilters = Object.values(filters).some((v) => v && v.trim() !== "");

  const exportCsv = () => {
    downloadCsv("employees.csv", toCsv(derivedRows, COLUMNS));
  };

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <div className="seg">
          <button
            className={`seg-btn${viewMode === "virtual" ? " active" : ""}`}
            onClick={() => dispatch({ type: "SET_VIEW_MODE", mode: "virtual" })}
          >
            Virtual scroll
          </button>
          <button
            className={`seg-btn${viewMode === "paginated" ? " active" : ""}`}
            onClick={() => dispatch({ type: "SET_VIEW_MODE", mode: "paginated" })}
          >
            Paginated
          </button>
        </div>

        <button
          className={`btn${showFilters ? " btn-primary" : " btn-ghost"}`}
          onClick={onToggleFilters}
        >
          {showFilters ? "Hide filters" : "Filters"}
        </button>

        <button
          className="btn btn-ghost"
          disabled={!hasFilters}
          onClick={() => dispatch({ type: "CLEAR_FILTERS" })}
        >
          Clear filters
        </button>

        <button className="btn btn-ghost" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="toolbar-group toolbar-status">
        {openEdits > 0 && (
          <span className="pill pill-warn" title="Rows with an open, unsaved editor">
            {openEdits} unsaved
          </span>
        )}
        {modifiedCount > 0 && (
          <span className="pill pill-info" title="Rows changed from their original value">
            {modifiedCount} modified
          </span>
        )}
        <span className="muted">
          {derivedRows.length.toLocaleString()} / {totalRows.toLocaleString()} rows
        </span>
      </div>
    </div>
  );
}
