import { useMemo } from "react";
import { generateEmployees } from "./data/generateData";
import { TableProvider } from "./state/TableContext";
import { DataTable } from "./components/DataTable";

const ROW_COUNT = 10_000;

export default function App() {
  // Generated once; deterministic so the dataset is stable across reloads.
  const rows = useMemo(() => generateEmployees(ROW_COUNT), []);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Advanced Editable Data Table</h1>
          <p className="subtitle">
            {ROW_COUNT.toLocaleString()} rows · inline editing · virtual scrolling ·
            multi-column sort &amp; filter · CSV export
          </p>
        </div>
      </header>

      <main className="app-main">
        <TableProvider initialRows={rows}>
          <DataTable />
        </TableProvider>
      </main>

      <footer className="app-footer">
        <span>
          Double-click a row (or hit <kbd>Edit</kbd>) to edit · <kbd>Enter</kbd> saves ·{" "}
          <kbd>Esc</kbd> cancels · click a header to sort, <kbd>Shift</kbd>+click for
          multi-sort
        </span>
      </footer>
    </div>
  );
}
