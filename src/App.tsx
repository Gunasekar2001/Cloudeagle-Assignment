import { useMemo } from "react";
import { generateEmployees } from "./data/generateData";
import { TableProvider } from "./state/TableContext";
import { DataTable } from "./components/DataTable";

/** Size of the demo dataset. Bump this to stress-test virtualization (50k, 100k…). */
const ROW_COUNT = 10_000;

/**
 * App shell. Generates the dataset once, wraps the table in its state provider,
 * and renders the header / table / footer. All table behaviour lives inside
 * <DataTable> and the TableProvider.
 */
export default function App() {
  // Deterministic (seeded) generation, memoised so it runs exactly once.
  const rows = useMemo(() => generateEmployees(ROW_COUNT), []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">⌗</div>
          <div>
            <h1>Advanced Editable Data Table</h1>
            <p className="subtitle">
              {ROW_COUNT.toLocaleString()} rows · inline editing · virtual scrolling ·
              multi-sort &amp; filter · global search · 5 export formats
            </p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <TableProvider initialRows={rows}>
          <DataTable />
        </TableProvider>
      </main>

      <footer className="app-footer">
        <span>
          <kbd>Double-click</kbd> a row to edit · <kbd>Enter</kbd> saves · <kbd>Esc</kbd>{" "}
          cancels · click a header to sort, <kbd>Shift</kbd>+click to multi-sort
        </span>
      </footer>
    </div>
  );
}
