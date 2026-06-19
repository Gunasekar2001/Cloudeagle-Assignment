import type { Employee, ColumnDef, Theme, Density } from "../types";
import { useTable } from "../state/TableContext";
import { ExportMenu } from "./ExportMenu";
import { ColumnMenu } from "./ColumnMenu";
import {
  SearchIcon,
  FilterIcon,
  PlusIcon,
  TrashIcon,
  SunIcon,
  MoonIcon,
  RowsIcon,
  XIcon,
} from "./Icons";

interface Props {
  viewRows: Employee[];
  selectedRows: Employee[];
  columns: ColumnDef[];
  allColumns: ColumnDef[];
  hidden: Set<string>;
  onToggleColumn: (key: string) => void;
  totalRows: number;
  showFilters: boolean;
  onToggleFilters: () => void;
  openEdits: number;
  modifiedCount: number;
  theme: Theme;
  onToggleTheme: () => void;
  density: Density;
  onToggleDensity: () => void;
  onToast: (msg: string) => void;
}

export function Toolbar({
  viewRows,
  selectedRows,
  columns,
  allColumns,
  hidden,
  onToggleColumn,
  totalRows,
  showFilters,
  onToggleFilters,
  openEdits,
  modifiedCount,
  theme,
  onToggleTheme,
  density,
  onToggleDensity,
  onToast,
}: Props) {
  const { state, dispatch } = useTable();
  const { viewMode, filters, search } = state;
  const hasFilters = search.trim() !== "" || Object.values(filters).some((v) => v && v.trim() !== "");
  const selectedCount = selectedRows.length;

  return (
    <div className="toolbar">
      {/* Row 1 — search + primary controls */}
      <div className="toolbar-row">
        <div className="search-box">
          <SearchIcon />
          <input
            className="search-input"
            placeholder="Search all columns…"
            value={search}
            aria-label="Global search"
            onChange={(e) => dispatch({ type: "SET_SEARCH", value: e.target.value })}
          />
          {search && (
            <button
              className="search-clear"
              aria-label="Clear search"
              onClick={() => dispatch({ type: "SET_SEARCH", value: "" })}
            >
              <XIcon width={14} height={14} />
            </button>
          )}
        </div>

        <div className="toolbar-group">
          {/* View-mode segmented control */}
          <div className="seg">
            <button
              className={`seg-btn${viewMode === "virtual" ? " active" : ""}`}
              onClick={() => dispatch({ type: "SET_VIEW_MODE", mode: "virtual" })}
            >
              Virtual
            </button>
            <button
              className={`seg-btn${viewMode === "paginated" ? " active" : ""}`}
              onClick={() => dispatch({ type: "SET_VIEW_MODE", mode: "paginated" })}
            >
              Paginated
            </button>
          </div>

          <button
            className={`btn hide-on-mobile${showFilters ? " btn-active" : ""}`}
            onClick={onToggleFilters}
            title="Toggle per-column filter row"
          >
            <FilterIcon />
            <span>Filters</span>
          </button>

          <ColumnMenu allColumns={allColumns} hidden={hidden} onToggle={onToggleColumn} />

          <ExportMenu
            viewRows={viewRows}
            selectedRows={selectedRows}
            columns={columns}
            onToast={onToast}
          />

          <button className="btn btn-primary" onClick={() => dispatch({ type: "ADD_ROW" })}>
            <PlusIcon />
            <span>Add row</span>
          </button>

          {/* Icon-only utility toggles */}
          <button
            className="icon-btn-lg hide-on-mobile"
            title={`Density: ${density} (click to toggle)`}
            aria-label="Toggle row density"
            onClick={onToggleDensity}
          >
            <RowsIcon />
          </button>
          <button
            className="icon-btn-lg"
            title={`Theme: ${theme} (click to toggle)`}
            aria-label="Toggle dark mode"
            onClick={onToggleTheme}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </div>

      {/* Row 2 — contextual status + selection actions */}
      <div className="toolbar-row toolbar-sub">
        <div className="toolbar-group">
          {selectedCount > 0 ? (
            <>
              <span className="pill pill-accent">{selectedCount} selected</span>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => {
                  dispatch({ type: "DELETE_ROWS", ids: selectedRows.map((r) => r.id) });
                  onToast(`Deleted ${selectedCount} rows`);
                }}
              >
                <TrashIcon width={14} height={14} />
                <span>Delete selected</span>
              </button>
              <button
                className="btn btn-sm"
                onClick={() => dispatch({ type: "CLEAR_SELECTION" })}
              >
                Clear selection
              </button>
            </>
          ) : (
            <span className="muted">
              Showing <strong>{viewRows.length.toLocaleString()}</strong> of{" "}
              {totalRows.toLocaleString()} rows
            </span>
          )}
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
          {hasFilters && (
            <button className="btn btn-sm" onClick={() => dispatch({ type: "CLEAR_FILTERS" })}>
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
