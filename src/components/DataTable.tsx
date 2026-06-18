import { useCallback, useMemo, useRef, useState } from "react";
import type { Employee } from "../types";
import { COLUMNS } from "../data/columns";
import { useTable } from "../state/TableContext";
import { useDerivedRows } from "../hooks/useDerivedRows";
import { useVirtualizer } from "../hooks/useVirtualizer";
import { useUnsavedPrompt } from "../hooks/useUnsavedPrompt";
import { useUiPrefs } from "../hooks/useUiPrefs";
import { TableHead } from "./TableHead";
import { TableRow } from "./TableRow";
import { Toolbar } from "./Toolbar";
import { Pagination } from "./Pagination";
import { SummaryBar } from "./SummaryBar";

// Layout constants. The row height switches with the density preference; the
// fixed value per mode is what makes the virtual-scroll math exact.
const ROW_HEIGHT = { comfortable: 48, compact: 36 } as const;
const BODY_HEIGHT = 560;
const CHECK_WIDTH = 44;
const ACTIONS_WIDTH = 132;

export function DataTable() {
  const { state } = useTable();
  const { drafts, history, modifiedIds, selectedIds, viewMode, page, pageSize, rows } = state;

  // UI-only prefs (persisted): theme, density, hidden columns.
  const { theme, toggleTheme, density, toggleDensity, hidden, toggleColumn } = useUiPrefs();
  const [showFilters, setShowFilters] = useState(true);

  // Lightweight toast for export / bulk-action feedback.
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  // The 3-stage derived view (search → filter → sort).
  const derived = useDerivedRows();

  // Visible columns respect the column-visibility menu.
  const visibleColumns = useMemo(() => COLUMNS.filter((c) => !hidden.has(c.key)), [hidden]);

  const rowHeight = ROW_HEIGHT[density];
  const gridTemplate = useMemo(
    () =>
      `${CHECK_WIDTH}px ` +
      visibleColumns.map((c) => `${c.width}px`).join(" ") +
      ` ${ACTIONS_WIDTH}px`,
    [visibleColumns]
  );
  const contentWidth = useMemo(
    () =>
      CHECK_WIDTH + visibleColumns.reduce((sum, c) => sum + c.width, 0) + ACTIONS_WIDTH,
    [visibleColumns]
  );

  // Warn before leaving while a row editor is still open.
  const openEdits = Object.keys(drafts).length;
  useUnsavedPrompt(openEdits > 0);

  // Selection helpers.
  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.has(r.id)),
    [rows, selectedIds]
  );
  const viewIds = useMemo(() => derived.map((r) => r.id), [derived]);
  const allSelected = viewIds.length > 0 && viewIds.every((id) => selectedIds.has(id));
  const someSelected = viewIds.some((id) => selectedIds.has(id));
  const { dispatch } = useTable();
  const toggleSelectAll = useCallback(() => {
    const next = new Set(selectedIds);
    if (allSelected) viewIds.forEach((id) => next.delete(id));
    else viewIds.forEach((id) => next.add(id));
    dispatch({ type: "SET_SELECTION", ids: [...next] });
  }, [allSelected, viewIds, selectedIds, dispatch]);

  // Virtualizer for the default mode.
  const virtual = useVirtualizer({
    rowCount: derived.length,
    rowHeight,
    viewportHeight: BODY_HEIGHT,
  });

  // Decide which rows to render and where to place them, per view mode.
  const { items, contentHeight } = useMemo(() => {
    if (viewMode === "paginated") {
      const start = page * pageSize;
      const slice = derived.slice(start, start + pageSize);
      return {
        items: slice.map((row, i) => ({ row, index: i })),
        contentHeight: slice.length * rowHeight,
      };
    }
    const slice: { row: Employee; index: number }[] = [];
    for (let i = virtual.startIndex; i < virtual.endIndex; i++) {
      slice.push({ row: derived[i], index: i });
    }
    return { items: slice, contentHeight: virtual.totalHeight };
  }, [viewMode, page, pageSize, derived, rowHeight, virtual.startIndex, virtual.endIndex, virtual.totalHeight]);

  return (
    <section className={`card density-${density}`} aria-label="Employees table">
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

      <div className="table-h-scroll">
        <div className="table-content" style={{ width: contentWidth }} role="table">
          <TableHead
            columns={visibleColumns}
            gridTemplate={gridTemplate}
            showFilters={showFilters}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleSelectAll={toggleSelectAll}
          />

          <div
            className="tbody"
            role="rowgroup"
            style={{ height: BODY_HEIGHT }}
            onScroll={viewMode === "virtual" ? virtual.onScroll : undefined}
          >
            {derived.length === 0 ? (
              <div className="empty">
                <div className="empty-emoji">🔍</div>
                No rows match your search or filters.
              </div>
            ) : (
              <div className="tbody-spacer" style={{ height: contentHeight }}>
                {items.map(({ row, index }) => (
                  <TableRow
                    key={row.id}
                    row={row}
                    draft={drafts[row.id]}
                    isModified={modifiedIds.has(row.id)}
                    isSelected={selectedIds.has(row.id)}
                    canUndo={(history[row.id]?.length ?? 0) > 0}
                    columns={visibleColumns}
                    gridTemplate={gridTemplate}
                    rowHeight={rowHeight}
                    top={index * rowHeight}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewMode === "paginated" && <Pagination total={derived.length} />}

      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
  );
}
