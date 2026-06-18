import { memo } from "react";
import type { Employee, EditableField, ColumnDef } from "../types";
import { formatCell } from "../utils/format";
import { useTable } from "../state/TableContext";
import { CheckIcon, XIcon, EditIcon, UndoIcon, TrashIcon } from "./Icons";

interface Props {
  row: Employee;
  /** Present only when this row's editor is open; holds unsaved field changes. */
  draft?: Partial<Employee>;
  isModified: boolean;
  isSelected: boolean;
  canUndo: boolean;
  /** Visible columns only (respects the column-visibility menu). */
  columns: ColumnDef[];
  gridTemplate: string;
  rowHeight: number;
  /** Absolute Y offset inside the virtual spacer (drives windowing). */
  top: number;
}

function TableRowInner({
  row,
  draft,
  isModified,
  isSelected,
  canUndo,
  columns,
  gridTemplate,
  rowHeight,
  top,
}: Props) {
  const { dispatch } = useTable();
  const isEditing = draft !== undefined;

  // Show the draft value while editing, otherwise the committed value.
  const valueOf = (key: keyof Employee) =>
    isEditing && key in (draft as object) ? (draft as Partial<Employee>)[key] : row[key];

  const onChange = (field: EditableField, raw: string, isNumber: boolean) => {
    const next: string | number = isNumber ? (raw === "" ? 0 : Number(raw)) : raw;
    if (isNumber && Number.isNaN(next as number)) return; // reject invalid numbers
    dispatch({ type: "CHANGE_DRAFT", id: row.id, field, value: next });
  };

  const rowClass =
    "tr" +
    (isEditing ? " editing" : "") +
    (isModified ? " modified" : "") +
    (isSelected ? " selected" : "");

  return (
    <div
      role="row"
      className={rowClass}
      style={{ gridTemplateColumns: gridTemplate, height: rowHeight, top }}
      onDoubleClick={() => !isEditing && dispatch({ type: "START_EDIT", id: row.id })}
    >
      {/* Selection checkbox */}
      <div role="cell" className="td td-check">
        <input
          type="checkbox"
          aria-label={`Select row ${row.id}`}
          checked={isSelected}
          onChange={() => dispatch({ type: "TOGGLE_SELECT", id: row.id })}
        />
      </div>

      {/* Data cells */}
      {columns.map((col) => {
        const v = valueOf(col.key);
        const align = col.align ?? "left";

        // Read-only cell.
        if (!isEditing || !col.editable) {
          return (
            <div
              role="cell"
              key={col.key}
              className="td"
              style={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}
              title={formatCell(col, v as Employee[keyof Employee])}
            >
              {col.key === "status" ? (
                <span className={`badge badge-${String(v).replace(/\s+/g, "-").toLowerCase()}`}>
                  {String(v)}
                </span>
              ) : (
                <span className="cell-text">{formatCell(col, v as Employee[keyof Employee])}</span>
              )}
            </div>
          );
        }

        // Editable cell (editor open).
        return (
          <div role="cell" key={col.key} className="td td-edit">
            {col.type === "select" ? (
              <select
                className="cell-input"
                value={String(v)}
                aria-label={col.label}
                onChange={(e) => onChange(col.key as EditableField, e.target.value, false)}
              >
                {col.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="cell-input"
                type={col.type === "number" ? "number" : "text"}
                value={String(v)}
                aria-label={col.label}
                style={{ textAlign: align }}
                onChange={(e) =>
                  onChange(col.key as EditableField, e.target.value, col.type === "number")
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") dispatch({ type: "SAVE_ROW", id: row.id });
                  if (e.key === "Escape") dispatch({ type: "CANCEL_EDIT", id: row.id });
                }}
              />
            )}
          </div>
        );
      })}

      {/* Row actions */}
      <div role="cell" className="td td-actions">
        {isEditing ? (
          <>
            <button
              className="icon-btn icon-btn-primary"
              title="Save (Enter)"
              aria-label="Save"
              onClick={() => dispatch({ type: "SAVE_ROW", id: row.id })}
            >
              <CheckIcon />
            </button>
            <button
              className="icon-btn"
              title="Cancel (Esc)"
              aria-label="Cancel"
              onClick={() => dispatch({ type: "CANCEL_EDIT", id: row.id })}
            >
              <XIcon />
            </button>
          </>
        ) : (
          <>
            <button
              className="icon-btn"
              title="Edit row"
              aria-label="Edit"
              onClick={() => dispatch({ type: "START_EDIT", id: row.id })}
            >
              <EditIcon />
            </button>
            <button
              className="icon-btn"
              title={canUndo ? "Undo last saved change" : "Nothing to undo"}
              aria-label="Undo"
              disabled={!canUndo}
              onClick={() => dispatch({ type: "UNDO_ROW", id: row.id })}
            >
              <UndoIcon />
            </button>
            <button
              className="icon-btn icon-btn-danger"
              title="Delete row"
              aria-label="Delete"
              onClick={() => dispatch({ type: "DELETE_ROWS", ids: [row.id] })}
            >
              <TrashIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Memoised so unchanged rows in the virtual window don't re-render on every state change. */
export const TableRow = memo(TableRowInner);
