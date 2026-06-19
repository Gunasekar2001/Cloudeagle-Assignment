import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import { FixedSizeList, type ListChildComponentProps } from "react-window";
import { COLUMNS } from "../data/columns";
import { useTable } from "../state/TableContext";
import { useDerivedRows } from "../hooks/useDerivedRows";
import { useUnsavedPrompt } from "../hooks/useUnsavedPrompt";
import { useUiPrefs } from "../hooks/useUiPrefs";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useElementSize } from "../hooks/useElementSize";
import { TableHead } from "./TableHead";
import { TableRow } from "./TableRow";
import { MobileCard } from "./MobileCard";
import { MobileControls } from "./MobileControls";
import { Toolbar } from "./Toolbar";
import { Pagination } from "./Pagination";
import { SummaryBar } from "./SummaryBar";

// Row heights. Desktop grid rows switch with density; mobile uses a taller
// fixed card slot. Each is constant per mode (react-window FixedSizeList needs
// a fixed item size).
const GRID_ROW_HEIGHT = { comfortable: 48, compact: 36 } as const;
const CARD_ROW_HEIGHT = 268;
const CHECK_WIDTH = 44;
const ACTIONS_WIDTH = 132;
const MOBILE_QUERY = "(max-width: 880px)";

export function DataTable() {
  const { state, dispatch } = useTable();
  const { drafts, history, modifiedIds, selectedIds, viewMode, page, pageSize, rows } = state;

  const { theme, toggleTheme, density, toggleDensity, hidden, toggleColumn } = useUiPrefs();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [showFilters, setShowFilters] = useState(true);

  // Measure the table region so react-window fills exactly the available space.
  const [regionRef, regionSize] = useElementSize();

  // Toast for export / bulk-action feedback.
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const derived = useDerivedRows();
  const visibleColumns = useMemo(() => COLUMNS.filter((c) => !hidden.has(c.key)), [hidden]);
  const rowHeight = isMobile ? CARD_ROW_HEIGHT : GRID_ROW_HEIGHT[density];

  // Fluid grid template — fixed checkbox + actions columns, fr-weighted data
  // columns that expand to fill the width (no horizontal scroll on desktop).
  const gridTemplate = useMemo(() => {
    const tracks = visibleColumns.map((c) => {
      const min = Math.max(64, Math.round(c.width * 0.5));
      return `minmax(${min}px, ${c.width / 100}fr)`;
    });
    return `${CHECK_WIDTH}px ${tracks.join(" ")} ${ACTIONS_WIDTH}px`;
  }, [visibleColumns]);

  const openEdits = Object.keys(drafts).length;
  useUnsavedPrompt(openEdits > 0);

  // Selection helpers.
  const selectedRows = useMemo(() => rows.filter((r) => selectedIds.has(r.id)), [rows, selectedIds]);
  const viewIds = useMemo(() => derived.map((r) => r.id), [derived]);
  const allSelected = viewIds.length > 0 && viewIds.every((id) => selectedIds.has(id));
  const someSelected = viewIds.some((id) => selectedIds.has(id));
  const toggleSelectAll = useCallback(() => {
    const next = new Set(selectedIds);
    if (allSelected) viewIds.forEach((id) => next.delete(id));
    else viewIds.forEach((id) => next.add(id));
    dispatch({ type: "SET_SELECTION", ids: [...next] });
  }, [allSelected, viewIds, selectedIds, dispatch]);

  // The rows to render in paginated mode (virtual mode lets react-window pick).
  const pageRows = useMemo(() => {
    if (viewMode !== "paginated") return [];
    const start = page * pageSize;
    return derived.slice(start, start + pageSize);
  }, [viewMode, page, pageSize, derived]);

  /** Render a single row, given an index and the style react-window provides. */
  const renderRow = useCallback(
    (index: number, style: CSSProperties) => {
      const row = derived[index];
      if (!row) return null;
      const common = {
        row,
        draft: drafts[row.id],
        isModified: modifiedIds.has(row.id),
        isSelected: selectedIds.has(row.id),
        canUndo: (history[row.id]?.length ?? 0) > 0,
        columns: visibleColumns,
      };
      if (isMobile) {
        return (
          <div className="mcard-slot" style={style}>
            <MobileCard {...common} />
          </div>
        );
      }
      return <TableRow {...common} gridTemplate={gridTemplate} style={style} />;
    },
    [derived, drafts, modifiedIds, selectedIds, history, visibleColumns, isMobile, gridTemplate]
  );

  // react-window item renderer (virtual mode).
  const WindowItem = useCallback(
    ({ index, style }: ListChildComponentProps) => renderRow(index, style),
    [renderRow]
  );

  return (
    <section className={`card density-${density}${isMobile ? " is-mobile" : ""}`} aria-label="Employees table">
      <Toolbar
        viewRows={derived}
        selectedRows={selectedRows}
        columns={visibleColumns}
        allColumns={COLUMNS}
        hidden={hidden}
        onToggleColumn={toggleColumn}
        totalRows={rows.length}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((s) => !s)}
        openEdits={openEdits}
        modifiedCount={modifiedIds.size}
        theme={theme}
        onToggleTheme={toggleTheme}
        density={density}
        onToggleDensity={toggleDensity}
        onToast={showToast}
      />

      <SummaryBar rows={derived} />

      {isMobile && (
        <MobileControls
          columns={visibleColumns}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      <div className="table-content" role="table">
        {!isMobile && (
          <TableHead
            columns={visibleColumns}
            gridTemplate={gridTemplate}
            showFilters={showFilters}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleSelectAll={toggleSelectAll}
          />
        )}

        {/* The flex-filling region: only THIS scrolls, never the whole page. */}
        <div className="table-region" ref={regionRef}>
          {derived.length === 0 ? (
            <div className="empty">
              <div className="empty-emoji">🔍</div>
              No rows match your search or filters.
            </div>
          ) : viewMode === "virtual" ? (
            regionSize.height > 0 && (
              <FixedSizeList
                height={regionSize.height}
                width={regionSize.width || "100%"}
                itemCount={derived.length}
                itemSize={rowHeight}
                overscanCount={8}
              >
                {WindowItem}
              </FixedSizeList>
            )
          ) : (
            // Paginated: a normal scroll container with the current page's rows.
            <div className="page-scroll" style={{ height: regionSize.height }}>
              {pageRows.map((row, i) => (
                <div key={row.id} className="page-row">
                  {renderRow(page * pageSize + i, { height: rowHeight })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {viewMode === "paginated" && <Pagination total={derived.length} />}

      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
