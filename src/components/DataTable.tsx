import { useMemo, useState } from "react";
import type { Employee } from "../types";
import { COLUMNS } from "../data/columns";
import { useTable } from "../state/TableContext";
import { useDerivedRows } from "../hooks/useDerivedRows";
import { useVirtualizer } from "../hooks/useVirtualizer";
import { useUnsavedPrompt } from "../hooks/useUnsavedPrompt";
import { TableHead } from "./TableHead";
import { TableRow } from "./TableRow";
import { Toolbar } from "./Toolbar";
import { Pagination } from "./Pagination";

const ROW_HEIGHT = 44;
const BODY_HEIGHT = 560;
const ACTIONS_WIDTH = 150;

export function DataTable() {
  const { state } = useTable();
  const { drafts, history, modifiedIds, viewMode, page, pageSize, rows } = state;
  const [showFilters, setShowFilters] = useState(true);

  const derived = useDerivedRows();

  const openEdits = Object.keys(drafts).length;
  useUnsavedPrompt(openEdits > 0);

  const gridTemplate = useMemo(
    () => COLUMNS.map((c) => `${c.width}px`).join(" ") + ` ${ACTIONS_WIDTH}px`,
    []
  );
  const contentWidth = useMemo(
    () => COLUMNS.reduce((sum, c) => sum + c.width, 0) + ACTIONS_WIDTH,
    []
  );

  const virtual = useVirtualizer({
    rowCount: derived.length,
    rowHeight: ROW_HEIGHT,
    viewportHeight: BODY_HEIGHT,
  });

  // Which slice of rows to actually render, and where to place each one.
  const { items, contentHeight } = useMemo(() => {
    if (viewMode === "paginated") {
      const start = page * pageSize;
      const slice = derived.slice(start, start + pageSize);
      return {
        items: slice.map((row, i) => ({ row, index: i })),
        contentHeight: slice.length * ROW_HEIGHT,
      };
    }
    const slice: { row: Employee; index: number }[] = [];
    for (let i = virtual.startIndex; i < virtual.endIndex; i++) {
      slice.push({ row: derived[i], index: i });
    }
    return { items: slice, contentHeight: virtual.totalHeight };
  }, [viewMode, page, pageSize, derived, virtual.startIndex, virtual.endIndex, virtual.totalHeight]);

  return (
    <section className="card" aria-label="Employees table">
      <Toolbar
        derivedRows={derived}
        totalRows={rows.length}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((s) => !s)}
        openEdits={openEdits}
        modifiedCount={modifiedIds.size}
      />

      <div className="table-h-scroll">
        <div className="table-content" style={{ width: contentWidth }} role="table">
          <TableHead gridTemplate={gridTemplate} showFilters={showFilters} />

          <div
            className="tbody"
            role="rowgroup"
            style={{ height: BODY_HEIGHT }}
            onScroll={viewMode === "virtual" ? virtual.onScroll : undefined}
          >
            {derived.length === 0 ? (
              <div className="empty">No rows match the current filters.</div>
            ) : (
              <div className="tbody-spacer" style={{ height: contentHeight }}>
                {items.map(({ row, index }) => (
                  <TableRow
                    key={row.id}
                    row={row}
                    draft={drafts[row.id]}
                    isModified={modifiedIds.has(row.id)}
                    canUndo={(history[row.id]?.length ?? 0) > 0}
                    gridTemplate={gridTemplate}
                    rowHeight={ROW_HEIGHT}
                    top={index * ROW_HEIGHT}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewMode === "paginated" && <Pagination total={derived.length} />}
    </section>
  );
}
