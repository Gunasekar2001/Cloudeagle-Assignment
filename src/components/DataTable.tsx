import { useCallback, useMemo, useRef, useState } from "react";
import type { Employee } from "../types";
import { COLUMNS } from "../data/columns";
import { useTable } from "../state/TableContext";
import { useDerivedRows } from "../hooks/useDerivedRows";
import { useVirtualizer } from "../hooks/useVirtualizer";
import { useUnsavedPrompt } from "../hooks/useUnsavedPrompt";
import { useUiPrefs } from "../hooks/useUiPrefs";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { TableHead } from "./TableHead";
import { TableRow } from "./TableRow";
import { MobileCard } from "./MobileCard";
import { MobileControls } from "./MobileControls";
import { Toolbar } from "./Toolbar";
import { Pagination } from "./Pagination";
import { SummaryBar } from "./SummaryBar";

// Row heights. Desktop grid rows switch with density; mobile uses a taller
// fixed card height that fits both the read and edit states. Each is constant
// per mode so the virtual-scroll math stays exact.
const GRID_ROW_HEIGHT = { comfortable: 48, compact: 36 } as const;
const CARD_ROW_HEIGHT = 268;
const BODY_HEIGHT = 560;
const CHECK_WIDTH = 44;
const ACTIONS_WIDTH = 132;

// Below this width the wide grid is replaced by stacked cards (covers phones
// and small tablets, and avoids the cramped mid-zone where columns wouldn't fit).
const MOBILE_QUERY = "(max-width: 880px)";

export function DataTable() {
  const { state, dispatch } = useTable();
  const { drafts, history, modifiedIds, selectedIds, viewMode, page, pageSize, rows } = state;

  const { theme, toggleTheme, density, toggleDensity, hidden, toggleColumn } = useUiPrefs();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [showFilters, setShowFilters] = useState(true);

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

  // Row height depends on layout mode.
  const rowHeight = isMobile ? CARD_ROW_HEIGHT : GRID_ROW_HEIGHT[density];

  /**
   * Fluid grid template: the checkbox + actions columns stay fixed, while each
   * data column becomes `minmax(min, weightFr)`. The `fr` weights let the
   * columns *expand to fill the viewport* (so there's no horizontal scroll on
   * desktop), and the `min` floor keeps them readable when space is tight.
   */
  const gridTemplate = useMemo(() => {
    const tracks = visibleColumns.map((c) => {
      const min = Math.max(64, Math.round(c.width * 0.5));
      const weight = c.width / 100; // wider columns get a larger share of free space
      return `minmax(${min}px, ${weight}fr)`;
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
      return { items: slice.map((row, i) => ({ row, index: i })), contentHeight: slice.length * rowHeight };
    }
    const slice: { row: Employee; index: number }[] = [];
    for (let i = virtual.startIndex; i < virtual.endIndex; i++) slice.push({ row: derived[i], index: i });
    return { items: slice, contentHeight: virtual.totalHeight };
  }, [viewMode, page, pageSize, derived, rowHeight, virtual.startIndex, virtual.endIndex, virtual.totalHeight]);

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

      {/* Mobile gets a compact sort/select bar in place of the column header. */}
      {isMobile && (
        <MobileControls
          columns={visibleColumns}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      <div className="table-h-scroll">
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

          <div
            className={`tbody${isMobile ? " tbody-cards" : ""}`}
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
                {items.map(({ row, index }) =>
                  isMobile ? (
                    <MobileCard
                      key={row.id}
                      row={row}
                      draft={drafts[row.id]}
                      isModified={modifiedIds.has(row.id)}
                      isSelected={selectedIds.has(row.id)}
                      canUndo={(history[row.id]?.length ?? 0) > 0}
                      columns={visibleColumns}
                      rowHeight={rowHeight}
                      top={index * rowHeight}
                    />
                  ) : (
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
                  )
                )}
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
