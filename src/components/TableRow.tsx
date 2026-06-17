import { memo } from "react";
import type { Employee, EditableField } from "../types";
import { COLUMNS } from "../data/columns";
import { formatCell } from "../utils/format";
import { useTable } from "../state/TableContext";

interface Props {
  row: Employee;
  draft?: Partial<Employee>;
  isModified: boolean;
  canUndo: boolean;
  gridTemplate: string;
  rowHeight: number;
  top: number;
}

function TableRowInner({
  row,
  draft,
  isModified,
  canUndo,
  gridTemplate,
  rowHeight,
  top,
}: Props) {
  const { dispatch } = useTable();
  const isEditing = draft !== undefined;

  const value = (key: keyof Employee) =>
    isEditing && key in (draft as object)
      ? (draft as Partial<Employee>)[key]
      : row[key];

  const onChange = (field: EditableField, raw: string, isNumber: boolean) => {
    const next: string | number = isNumber ? (raw === "" ? 0 : Number(raw)) : raw;
    if (isNumber && Number.isNaN(next as number)) return;
    dispatch({ type: "CHANGE_DRAFT", id: row.id, field, value: next });
  };

  return (
    <div
      role="row"
      className={`tr${isEditing ? " editing" : ""}${isModified ? " modified" : ""}`}
      style={{ gridTemplateColumns: gridTemplate, height: rowHeight, top }}
      onDoubleClick={() => !isEditing && dispatch({ type: "START_EDIT", id: row.id })}
    >
      {COLUMNS.map((col) => {
        const v = value(col.key);
        const align = col.align ?? "left";
        if (!isEditing || !col.editable) {
          return (
            <div
              role="cell"
              key={col.key}
              className="td"
              style={{ textAlign: align }}
              title={formatCell(col, v as Employee[keyof Employee])}
            >
              {col.key === "status" ? (
                <span className={`badge badge-${String(v).replace(/\s+/g, "-").toLowerCase()}`}>
                  {String(v)}
                </span>
              ) : (
                formatCell(col, v as Employee[keyof Employee])
              )}
            </div>
          );
        }

        // Editing an editable cell.
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

      <div role="cell" className="td td-actions">
        {isEditing ? (
          <>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => dispatch({ type: "SAVE_ROW", id: row.id })}
            >
              Save
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => dispatch({ type: "CANCEL_EDIT", id: row.id })}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => dispatch({ type: "START_EDIT", id: row.id })}
            >
              Edit
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={!canUndo}
              title={canUndo ? "Undo last saved change" : "Nothing to undo"}
              onClick={() => dispatch({ type: "UNDO_ROW", id: row.id })}
            >
              Undo
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export const TableRow = memo(TableRowInner);
