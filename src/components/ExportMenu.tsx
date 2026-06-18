import { useCallback, useState } from "react";
import type { Employee, ColumnDef, ExportFormat } from "../types";
import { exportRows } from "../utils/export";
import { useClickOutside } from "../hooks/useClickOutside";
import { DownloadIcon, ChevronDownIcon } from "./Icons";

interface Props {
  /** Rows in the current (searched + filtered + sorted) view. */
  viewRows: Employee[];
  /** The checkbox-selected rows (subset of all rows). */
  selectedRows: Employee[];
  /** Visible columns — exports respect column visibility. */
  columns: ColumnDef[];
  /** Surfaces a short status/toast message after an export. */
  onToast: (msg: string) => void;
}

const FORMATS: { id: ExportFormat; label: string; hint: string }[] = [
  { id: "csv", label: "CSV", hint: ".csv" },
  { id: "json", label: "JSON", hint: ".json" },
  { id: "excel", label: "Excel", hint: ".xls" },
  { id: "clipboard", label: "Copy to clipboard", hint: "TSV" },
  { id: "print", label: "Print / Save as PDF", hint: "" },
];

export function ExportMenu({ viewRows, selectedRows, columns, onToast }: Props) {
  const [open, setOpen] = useState(false);
  // Export either the whole view or just the selected rows.
  const [scopeSelected, setScopeSelected] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(useCallback(() => setOpen(false), []));

  const hasSelection = selectedRows.length > 0;
  const rows = scopeSelected && hasSelection ? selectedRows : viewRows;

  const run = async (format: ExportFormat) => {
    setOpen(false);
    try {
      const msg = await exportRows(format, rows, columns);
      onToast(msg);
    } catch {
      onToast("Export failed");
    }
  };

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <DownloadIcon />
        <span>Export</span>
        <ChevronDownIcon width={14} height={14} />
      </button>

      {open && (
        <div className="menu" role="menu">
          <div className="menu-label">Export {rows.length.toLocaleString()} rows as</div>
          {FORMATS.map((f) => (
            <button key={f.id} className="menu-item" role="menuitem" onClick={() => run(f.id)}>
              <span>{f.label}</span>
              {f.hint && <span className="menu-hint">{f.hint}</span>}
            </button>
          ))}

          <div className="menu-divider" />
          <label className={`menu-check${!hasSelection ? " disabled" : ""}`}>
            <input
              type="checkbox"
              disabled={!hasSelection}
              checked={scopeSelected && hasSelection}
              onChange={(e) => setScopeSelected(e.target.checked)}
            />
            <span>
              Selected rows only{hasSelection ? ` (${selectedRows.length})` : ""}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
