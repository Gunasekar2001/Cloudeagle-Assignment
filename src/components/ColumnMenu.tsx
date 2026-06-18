import { useCallback, useState } from "react";
import type { ColumnDef } from "../types";
import { useClickOutside } from "../hooks/useClickOutside";
import { ColumnsIcon, ChevronDownIcon } from "./Icons";

interface Props {
  /** All columns (including hidden), used to render the toggle list. */
  allColumns: ColumnDef[];
  /** Set of hidden column keys. */
  hidden: Set<string>;
  onToggle: (key: string) => void;
}

/** Dropdown to show/hide individual columns. The `id` column is always kept visible. */
export function ColumnMenu({ allColumns, hidden, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(useCallback(() => setOpen(false), []));
  const hiddenCount = hidden.size;

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <ColumnsIcon />
        <span>Columns{hiddenCount ? ` (${allColumns.length - hiddenCount}/${allColumns.length})` : ""}</span>
        <ChevronDownIcon width={14} height={14} />
      </button>

      {open && (
        <div className="menu" role="menu">
          <div className="menu-label">Toggle columns</div>
          {allColumns.map((col) => {
            const isId = col.key === "id";
            const visible = !hidden.has(col.key);
            return (
              <label key={col.key} className={`menu-check${isId ? " disabled" : ""}`}>
                <input
                  type="checkbox"
                  checked={visible}
                  disabled={isId}
                  onChange={() => onToggle(col.key)}
                />
                <span>{col.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
